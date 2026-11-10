/*
 * 児童用のHTTPのAPIのコントラクトテスト（仕様書backend.mdの「HTTPのAPI」「エラーの応答」「入力の上限」「アクセス制御」）
 * `app.handle()`で呼び、応答が各ルートの応答スキーマに合うことと、表のとおりの状態コードになることを確かめる
 */
import { beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import type { Cell, Command, CompileResult, Maze, Program } from "@kasane/core";
import {
	FLOOR,
	GOAL,
	HOLE,
	START,
	TELEPORT_DOWN,
	TELEPORT_UP,
	TUTORIALS,
	WALL,
	compile,
} from "@kasane/core";
import { eq, sql } from "drizzle-orm";
import { getSchemaValidator } from "elysia";
import type { TSchema } from "elysia";

import { createApp } from "./app";
import { generateToken, hashToken } from "./domain/services/token";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "./infrastructure/database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "./infrastructure/database/schema";
import {
	compileResultBody,
	mazeIdBody,
	mazesBody,
	meBody,
	tokenBody,
} from "./presentation/schemas";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(30_000);

const app = createApp({ db });

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const UNAUTHORIZED = { code: "unauthorized" };
const NOT_FOUND = { code: "notFound" };
const LESSON_ENDED = { code: "lessonEnded" };
const INVALID_INPUT = { code: "invalidInput" };
const MAZE_LOCKED = { code: "mazeLocked" };
const TUTORIAL_LOCKED = { code: "tutorialLocked" };

type CallOptions = { token?: string; body?: unknown };

const call = (method: string, path: string, { token, body }: CallOptions = {}) =>
	app.handle(
		new Request(`http://localhost${path}`, {
			method,
			headers: {
				...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
				...(body === undefined ? {} : { "content-type": "application/json" }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
	);

// 応答の本文を、読みたい項目の型を付けて取り出す（中身は期待値と応答スキーマで確かめる）
const json = async <Body>(res: Response): Promise<Body> => (await res.json()) as Body;

// 応答の本文が、ルートの応答スキーマに合うか
const conforms = (schema: TSchema, value: unknown): boolean =>
	getSchemaValidator(schema).Check(value);

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("行が返されませんでした");
	return row;
};

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

const times = <Item>(count: number, item: Item): Item[] =>
	Array.from({ length: count }, () => item);

const F = FLOOR;
const W = WALL;

const forward: Command = { type: "forward" };
const repeat = (count: number, body: Command[]): Command => ({
	type: "repeat",
	times: count,
	body,
});

// 一辺5マス・1階の迷路。スタートから東へ4マス進むとゴール
const MAZE_FLOOR: Cell[][] = [
	[START, F, F, F, GOAL],
	times(5, W),
	times(5, W),
	times(5, W),
	times(5, W),
];
const MAZE: Maze = { startDirection: "east", layers: [MAZE_FLOOR] };
const SOLUTION: Program = times(4, forward);

// チュートリアルnoの迷路
const tutorialMaze = (no: number): Maze => {
	const tutorial = TUTORIALS[no - 1];
	if (!tutorial) throw new Error(`チュートリアル${no}がありません`);
	return tutorial.maze;
};

// 一辺6マス・2階の迷路。1階のテレポートで2階へ上がる
const TWO_FLOOR_MAZE: Maze = {
	startDirection: "south",
	layers: [
		[
			[START, W, W, W, W, W],
			[F, W, W, W, W, W],
			[TELEPORT_UP, W, W, W, W, W],
			times(6, W),
			times(6, W),
			times(6, W),
		],
		[times(6, W), times(6, W), [F, F, GOAL, W, W, W], times(6, W), times(6, W), times(6, W)],
	],
};

// 一辺sizeマスの、壁だけの階
const wallFloor = (size: number): Cell[][] => times(size, times(size, W));

// 一辺sizeマスの、スタートとゴールが隣り合う階
const squareFloor = (size: number): Cell[][] => [
	[START, GOAL, ...times(size - 2, W)],
	...times(size - 1, times(size, W)),
];

// MAZEの階の、一部のマスを置き換えた階
const floorWithCells = (cells: { y: number; x: number; cell: Cell }[]): Cell[][] =>
	MAZE_FLOOR.map((row, y) =>
		row.map((original, x) => cells.find((c) => c.y === y && c.x === x)?.cell ?? original),
	);

// MAZEの一部のマスを置き換えた迷路
const mazeWithCells = (cells: { y: number; x: number; cell: Cell }[]): Maze => ({
	...MAZE,
	layers: [floorWithCells(cells)],
});

// 型（TypeBox）の検証で落ちる迷路（backend.mdの「入力の上限」）
const MALFORMED_MAZES: { name: string; data: unknown }[] = [
	{ name: "オブジェクトではない", data: "maze" },
	{ name: "layersがない", data: { startDirection: "east" } },
	{ name: "startDirectionがない", data: { layers: MAZE.layers } },
	{ name: "0階", data: { ...MAZE, layers: [] } },
	{ name: "4階", data: { ...MAZE, layers: [...MAZE.layers, ...times(3, wallFloor(5))] } },
	// スタートとゴールを置き、validateMazeは通る形にする（大きさの範囲だけで落ちることを確かめる）
	{ name: "一辺が4マス", data: { ...MAZE, layers: [squareFloor(4)] } },
	{ name: "一辺が8マス", data: { ...MAZE, layers: [squareFloor(8)] } },
	{ name: "行のマスが4つ", data: { ...MAZE, layers: [times(5, times(4, W))] } },
	{ name: "行のマスが8つ", data: { ...MAZE, layers: [times(5, times(8, W))] } },
	{
		name: "8種類にないマス",
		data: { ...MAZE, layers: [[[START, F, F, "lava", GOAL], ...times(4, times(5, W))]] },
	},
	{ name: "4方向にない向き", data: { ...MAZE, startDirection: "up" } },
];

// 型は合っているが、validateMazeで落ちる迷路（domain.mdの「迷路の正しさ」）
const INVALID_MAZES: { name: string; data: Maze }[] = [
	{
		name: "正方形でない（5行で各行が6マス）",
		data: { ...MAZE, layers: [[[START, F, F, F, F, GOAL], ...times(4, times(6, W))]] },
	},
	{
		name: "階ごとに大きさが違う",
		data: { ...MAZE, layers: [...MAZE.layers, wallFloor(6)] },
	},
	{ name: "スタートがない", data: mazeWithCells([{ y: 0, x: 0, cell: F }]) },
	{ name: "スタートが二つ", data: mazeWithCells([{ y: 0, x: 1, cell: START }]) },
	{ name: "ゴールがない", data: mazeWithCells([{ y: 0, x: 4, cell: F }]) },
	{ name: "ゴールが二つ", data: mazeWithCells([{ y: 0, x: 3, cell: GOAL }]) },
	{
		name: "一番上の階に上へのテレポートがある",
		data: mazeWithCells([{ y: 0, x: 2, cell: TELEPORT_UP }]),
	},
	{
		name: "一番下の階に下へのテレポートがある",
		data: mazeWithCells([{ y: 0, x: 2, cell: TELEPORT_DOWN }]),
	},
	{
		name: "テレポートの行き先が壁",
		data: {
			...MAZE,
			layers: [floorWithCells([{ y: 0, x: 2, cell: TELEPORT_UP }]), wallFloor(5)],
		},
	},
	{
		name: "テレポートの行き先が穴",
		data: {
			...MAZE,
			layers: [
				floorWithCells([{ y: 0, x: 2, cell: TELEPORT_UP }]),
				[[W, W, HOLE, W, W], ...times(4, times(5, W))],
			],
		},
	},
];

// 名前と迷路の名前で、422になるもの（backend.mdの「入力の上限」）
const INVALID_NAMES: { name: string; value: unknown }[] = [
	{ name: "空文字", value: "" },
	{ name: "半角の空白だけ", value: "   " },
	{ name: "全角の空白だけ", value: "　　" },
	{ name: "21文字", value: "あ".repeat(21) },
	{ name: "途中に改行がある", value: "た\nろう" },
	{ name: "途中にタブがある", value: "た\tろう" },
	{ name: "途中に制御文字がある", value: "た\u0000ろう" },
	{ name: "途中にDELがある", value: "た\u007Fろう" },
	{ name: "途中にC1の制御文字がある", value: "た\u0085ろう" },
	{ name: "途中に行の区切り（U+2028）がある", value: "た\u2028ろう" },
	{ name: "文字列ではない", value: 123 },
];

// 型（TypeBox）の検証で落ちるプログラム（backend.mdの「入力の上限」）
const MALFORMED_PROGRAMS: { name: string; program: unknown }[] = [
	{ name: "配列ではない", program: "forward" },
	{ name: "命令がオブジェクトではない", program: ["forward"] },
	{ name: "5種類にない命令", program: [{ type: "jump" }] },
	{ name: "くりかえしの回数が1", program: [{ type: "repeat", times: 1, body: [forward] }] },
	{ name: "くりかえしの回数が11", program: [{ type: "repeat", times: 11, body: [forward] }] },
	{ name: "くりかえしの回数が整数ではない", program: [{ type: "repeat", times: 2.5, body: [] }] },
	{ name: "くりかえしの回数がない", program: [{ type: "repeat", body: [forward] }] },
	{ name: "くりかえしの中身がない", program: [{ type: "repeat", times: 2 }] },
	{
		name: "くりかえしの中身に5種類にない命令がある",
		program: [{ type: "repeat", times: 2, body: [{ type: "jump" }] }],
	},
];

// 型は合っているが、validateProgramで落ちるプログラム（domain.mdの「プログラムの正しさ」）
const TOO_MANY_COMMANDS: Program = times(101, forward);
const TOO_DEEP: Program = [repeat(2, [repeat(2, [repeat(2, [repeat(2, [forward])])])])];

let openLessonId: string;
let endedLessonId: string;
let teacherToken: string;

// 書き込まない検査（422になる入力など）で使い回す。どのテストも、これらの児童と迷路を変えない
let sharedStudent: { token: string; studentId: string };
let sharedGraduate: { token: string; studentId: string };
let sharedMaze: typeof mazes.$inferSelect;
let endedStudent: { token: string; studentId: string };

const seedStudent = async (lessonId: string = openLessonId, name = "たろう") => {
	const token = generateToken();
	const student = only(
		await db
			.insert(students)
			.values({ lessonId, name, tokenHash: hashToken(token) })
			.returning(),
	);
	return { token, studentId: student.id };
};

// チュートリアルの1問目からcount問目までを、クリアしたことにする
const seedCleared = async (studentId: string, count: number) => {
	await db.insert(attempts).values(
		Array.from({ length: count }, (_, index) => ({
			studentId,
			tutorialNo: index + 1,
			program: [],
			succeeded: true,
		})),
	);
};

// チュートリアルを全部クリアした児童（自分の迷路を作れる）
const seedGraduate = async (lessonId: string = openLessonId) => {
	const student = await seedStudent(lessonId);
	await seedCleared(student.studentId, TUTORIALS.length);
	return student;
};

const seedMaze = async (
	studentId: string,
	values: { name?: string; data?: Maze; updatedAt?: Date } = {},
) =>
	only(
		await db
			.insert(mazes)
			.values({
				studentId,
				name: values.name ?? "めいろ",
				data: values.data ?? MAZE,
				...(values.updatedAt === undefined
					? {}
					: { createdAt: values.updatedAt, updatedAt: values.updatedAt }),
			})
			.returning(),
	);

const findAttempts = (studentId: string) =>
	db.select().from(attempts).where(eq(attempts.studentId, studentId));

const findMazes = (studentId: string) =>
	db.select().from(mazes).where(eq(mazes.studentId, studentId));

// トークンが要る児童用のルート。パスの迷路のIDは存在しないものでよい（本人の特定と授業の終わりの確認が先）
const STUDENT_ROUTES: { method: string; path: string; body?: unknown }[] = [
	{ method: "GET", path: "/me" },
	{ method: "POST", path: "/me/tutorials/1/attempts", body: { program: SOLUTION } },
	{
		method: "POST",
		path: `/me/mazes/${crypto.randomUUID()}/attempts`,
		body: { program: SOLUTION },
	},
	{ method: "GET", path: "/me/mazes" },
	{ method: "POST", path: "/me/mazes", body: { name: "めいろ", data: MAZE } },
	{ method: "PUT", path: `/me/mazes/${crypto.randomUUID()}`, body: { name: "めいろ", data: MAZE } },
	{ method: "DELETE", path: `/me/mazes/${crypto.randomUUID()}` },
];

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);

	// 教師1人と、開いている授業・終わっている授業を一つずつ作り、すべてのテストで使う
	teacherToken = generateToken();
	const teacher = only(
		await db
			.insert(teachers)
			.values({ tokenHash: hashToken(teacherToken) })
			.returning(),
	);
	const [open, ended] = await db
		.insert(lessons)
		.values([
			{ teacherId: teacher.id, endsAt: hoursFromNow(1) },
			{ teacherId: teacher.id, createdAt: hoursFromNow(-6), endsAt: hoursFromNow(-1) },
		])
		.returning();
	if (!open || !ended) throw new Error("授業を作れませんでした");
	openLessonId = open.id;
	endedLessonId = ended.id;

	[sharedStudent, sharedGraduate, endedStudent] = await Promise.all([
		seedStudent(),
		seedGraduate(),
		seedStudent(endedLessonId),
	]);
	sharedMaze = await seedMaze(sharedGraduate.studentId);
});

describe("POST /students", () => {
	it("トークンなしで呼べて、201でトークンを返し、その授業の児童を作る", async () => {
		const res = await call("POST", "/students", {
			body: { lessonId: openLessonId, name: "たろう" },
		});
		const body = await json<{ token: string }>(res);

		expect(res.status).toBe(201);
		expect(conforms(tokenBody, body)).toBe(true);
		expect(body.token).toMatch(TOKEN_PATTERN);

		// DBにはトークンのSHA-256だけを保存する
		const student = only(
			await db
				.select()
				.from(students)
				.where(eq(students.tokenHash, hashToken(body.token))),
		);
		expect(student.lessonId).toBe(openLessonId);
		expect(student.name).toBe("たろう");
		expect(await db.select().from(students).where(eq(students.tokenHash, body.token))).toEqual([]);
	});

	it("発行したトークンで児童用のAPIを使える", async () => {
		const { token } = await json<{ token: string }>(
			await call("POST", "/students", { body: { lessonId: openLessonId, name: "はなこ" } }),
		);

		const res = await call("GET", "/me", { token });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ name: "はなこ", clearedCount: 0 });
	});

	it("同じ授業に同じ名前の児童がいても、別の児童として新しく作る", async () => {
		const name = `おなじなまえ${crypto.randomUUID().slice(0, 8)}`;

		const first = await call("POST", "/students", { body: { lessonId: openLessonId, name } });
		const second = await call("POST", "/students", { body: { lessonId: openLessonId, name } });

		expect(first.status).toBe(201);
		expect(second.status).toBe(201);
		expect((await json<{ token: string }>(first)).token).not.toBe(
			(await json<{ token: string }>(second)).token,
		);
		expect(await db.select().from(students).where(eq(students.name, name))).toHaveLength(2);
	});

	it.each([
		{ name: "1文字", value: "あ", saved: "あ" },
		{ name: "20文字", value: "あ".repeat(20), saved: "あ".repeat(20) },
		{ name: "前後に空白がある", value: " 　たろう　 ", saved: "たろう" },
		{
			name: "前後の空白を削ると20文字",
			value: `  ${"あ".repeat(20)}  `,
			saved: "あ".repeat(20),
		},
	])("名前が$name: 201を返し、前後の空白を削って保存する", async ({ value, saved }) => {
		const res = await call("POST", "/students", {
			body: { lessonId: openLessonId, name: value },
		});
		const { token } = await json<{ token: string }>(res);

		expect(res.status).toBe(201);
		const student = only(
			await db
				.select()
				.from(students)
				.where(eq(students.tokenHash, hashToken(token))),
		);
		expect(student.name).toBe(saved);
	});

	it.each(INVALID_NAMES)("名前が$name: 422を返す", async ({ value }) => {
		const res = await call("POST", "/students", {
			body: { lessonId: openLessonId, name: value },
		});

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it.each([
		{ name: "名前がない", body: () => ({ lessonId: openLessonId }) },
		{ name: "授業のIDがない", body: () => ({ name: "たろう" }) },
		{ name: "授業のIDがUUIDではない", body: () => ({ lessonId: "not-a-uuid", name: "たろう" }) },
		{
			name: "授業のIDにurn:uuid:が付いている",
			body: () => ({ lessonId: `urn:uuid:${openLessonId}`, name: "たろう" }),
		},
	])("$name: 422を返す", async ({ body }) => {
		const res = await call("POST", "/students", { body: body() });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it("授業がなければ404を返す", async () => {
		const res = await call("POST", "/students", {
			body: { lessonId: crypto.randomUUID(), name: "たろう" },
		});

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("授業が終わっていれば410を返し、児童を作らない", async () => {
		const name = `おわったあと${crypto.randomUUID().slice(0, 8)}`;

		const res = await call("POST", "/students", { body: { lessonId: endedLessonId, name } });

		expect(res.status).toBe(410);
		expect(await res.json()).toEqual(LESSON_ENDED);
		expect(await db.select().from(students).where(eq(students.name, name))).toEqual([]);
	});
});

describe("トークンが要る児童用のルート", () => {
	it.each(STUDENT_ROUTES)(
		"$method $path: トークンがなければ401とWWW-Authenticate: Bearerを返す",
		async ({ method, path, body }) => {
			const res = await call(method, path, { body });

			expect(res.status).toBe(401);
			expect(res.headers.get("www-authenticate")).toBe("Bearer");
			expect(await res.json()).toEqual(UNAUTHORIZED);
		},
	);

	it.each(STUDENT_ROUTES)(
		"$method $path: 教師のトークンでは401を返す",
		async ({ method, path, body }) => {
			const res = await call(method, path, { token: teacherToken, body });

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual(UNAUTHORIZED);
		},
	);

	it.each(STUDENT_ROUTES)(
		"$method $path: 授業が終わっていれば410を返す",
		async ({ method, path, body }) => {
			const { token } = endedStudent;

			const res = await call(method, path, { token, body });

			expect(res.status).toBe(410);
			expect(await res.json()).toEqual(LESSON_ENDED);
		},
	);

	it("授業が終わった後に送ったプログラムは記録しない", async () => {
		const { token, studentId } = endedStudent;

		await call("POST", "/me/tutorials/1/attempts", { token, body: { program: SOLUTION } });

		expect(await findAttempts(studentId)).toEqual([]);
	});
});

describe("GET /me", () => {
	it("名前とクリア数を返す", async () => {
		const { token } = await seedStudent(openLessonId, "じろう");

		const res = await call("GET", "/me", { token });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(conforms(meBody, body)).toBe(true);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(body).toEqual({ name: "じろう", clearedCount: 0 });
	});

	it("クリア数は、成功した記録にあるチュートリアルの種類の数", async () => {
		const { token, studentId } = await seedStudent();
		const other = await seedStudent();
		const maze = await seedMaze(studentId);
		await db.insert(attempts).values([
			// 1問目は2回成功しても1つと数える
			{ studentId, tutorialNo: 1, program: [], succeeded: true },
			{ studentId, tutorialNo: 1, program: [], succeeded: true },
			// 2問目は失敗の後に成功
			{ studentId, tutorialNo: 2, program: [], succeeded: false },
			{ studentId, tutorialNo: 2, program: [], succeeded: true },
			// 3問目は失敗だけなので数えない
			{ studentId, tutorialNo: 3, program: [], succeeded: false },
			// 自分の迷路の成功は数えない
			{ studentId, mazeId: maze.id, program: [], succeeded: true },
			// 他の児童の成功は数えない
			{ studentId: other.studentId, tutorialNo: 3, program: [], succeeded: true },
		]);

		const res = await call("GET", "/me", { token });

		expect(await res.json()).toEqual({ name: "たろう", clearedCount: 2 });
	});
});

describe("POST /me/tutorials/:no/attempts", () => {
	it("解けるプログラムなら、201でコンパイルの結果を返し、成功として記録する", async () => {
		const { token, studentId } = await seedStudent();
		const expected = compile(tutorialMaze(1), SOLUTION);

		const res = await call("POST", "/me/tutorials/1/attempts", {
			token,
			body: { program: SOLUTION },
		});
		const body = await json<CompileResult>(res);

		expect(res.status).toBe(201);
		expect(conforms(compileResultBody, body)).toBe(true);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(body).toEqual(expected);
		expect(body.outcome).toBe("goal");

		const recorded = await findAttempts(studentId);
		expect(recorded).toHaveLength(1);
		expect(recorded[0]).toMatchObject({
			studentId,
			tutorialNo: 1,
			mazeId: null,
			program: SOLUTION,
			succeeded: true,
		});
	});

	it("クリアするとクリア数が増え、次のチュートリアルが解放される", async () => {
		const { token } = await seedStudent();

		await call("POST", "/me/tutorials/1/attempts", { token, body: { program: SOLUTION } });

		const me = await call("GET", "/me", { token });
		const next = await call("POST", "/me/tutorials/2/attempts", {
			token,
			body: { program: [forward] },
		});

		expect(await me.json()).toEqual({ name: "たろう", clearedCount: 1 });
		expect(next.status).toBe(201);
	});

	it("解けないプログラムでも、201でコンパイルの結果を返し、失敗として記録する", async () => {
		const { token, studentId } = await seedStudent();
		const program: Program = [forward];
		const expected = compile(tutorialMaze(1), program);

		const res = await call("POST", "/me/tutorials/1/attempts", { token, body: { program } });
		const body = await json<CompileResult>(res);

		expect(res.status).toBe(201);
		expect(conforms(compileResultBody, body)).toBe(true);
		expect(body).toEqual(expected);
		expect(body.outcome).not.toBe("goal");

		const recorded = await findAttempts(studentId);
		expect(recorded).toHaveLength(1);
		expect(recorded[0]).toMatchObject({ tutorialNo: 1, program, succeeded: false });

		const me = await call("GET", "/me", { token });
		expect(await me.json()).toEqual({ name: "たろう", clearedCount: 0 });
	});

	it("くりかえしを使ったプログラムを受け付ける", async () => {
		const { token } = await seedStudent();
		const program: Program = [repeat(2, [repeat(2, [forward])])];

		const res = await call("POST", "/me/tutorials/1/attempts", { token, body: { program } });
		const body = await json<CompileResult>(res);

		expect(res.status).toBe(201);
		expect(conforms(compileResultBody, body)).toBe(true);
		expect(body.outcome).toBe("goal");
	});

	it("解放前のチュートリアルは403を返し、記録しない", async () => {
		const { token, studentId } = await seedStudent();

		const res = await call("POST", "/me/tutorials/2/attempts", {
			token,
			body: { program: SOLUTION },
		});

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual(TUTORIAL_LOCKED);
		expect(await findAttempts(studentId)).toEqual([]);
	});

	it("最後のチュートリアルも、一つ前までクリアしていなければ403を返す", async () => {
		const { token, studentId } = await seedStudent();
		await seedCleared(studentId, TUTORIALS.length - 2);

		const res = await call("POST", `/me/tutorials/${TUTORIALS.length}/attempts`, {
			token,
			body: { program: SOLUTION },
		});

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual(TUTORIAL_LOCKED);
	});

	it("クリア済みのチュートリアルにも、もう一度挑戦できる", async () => {
		const { token, studentId } = await seedStudent();
		await seedCleared(studentId, 3);

		const res = await call("POST", "/me/tutorials/1/attempts", {
			token,
			body: { program: SOLUTION },
		});

		expect(res.status).toBe(201);
	});

	it.each([
		{ name: "0", no: "0" },
		{ name: "チュートリアルの数より1大きい", no: String(TUTORIALS.length + 1) },
		{ name: "負の数", no: "-1" },
		{ name: "小数", no: "1.5" },
		{ name: "数ではない", no: "abc" },
	])("noが$name: 422を返す", async ({ no }) => {
		const { token } = sharedStudent;

		const res = await call("POST", `/me/tutorials/${no}/attempts`, {
			token,
			body: { program: SOLUTION },
		});

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it.each(MALFORMED_PROGRAMS)("プログラムが$name: 422を返す", async ({ program }) => {
		const { token } = sharedStudent;

		const res = await call("POST", "/me/tutorials/1/attempts", { token, body: { program } });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it("本文にプログラムがなければ422を返す", async () => {
		const { token } = sharedStudent;

		const res = await call("POST", "/me/tutorials/1/attempts", { token, body: {} });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it("命令の数が100なら受け付け、101なら422を返して記録しない", async () => {
		const { token, studentId } = await seedStudent();

		const accepted = await call("POST", "/me/tutorials/1/attempts", {
			token,
			body: { program: times(100, forward) },
		});
		const rejected = await call("POST", "/me/tutorials/1/attempts", {
			token,
			body: { program: TOO_MANY_COMMANDS },
		});

		expect(accepted.status).toBe(201);
		expect(rejected.status).toBe(422);
		expect(await rejected.json()).toEqual(INVALID_INPUT);
		expect(await findAttempts(studentId)).toHaveLength(1);
	});

	it("くりかえしの入れ子が3段なら受け付け、4段なら422を返す", async () => {
		const { token } = await seedStudent();

		const accepted = await call("POST", "/me/tutorials/1/attempts", {
			token,
			body: { program: [repeat(2, [repeat(2, [repeat(2, [forward])])])] },
		});
		const rejected = await call("POST", "/me/tutorials/1/attempts", {
			token,
			body: { program: TOO_DEEP },
		});

		expect(accepted.status).toBe(201);
		expect(rejected.status).toBe(422);
		expect(await rejected.json()).toEqual(INVALID_INPUT);
	});

	it("問題の枚数の上限（5問目は7枚）までは受け付け、超えると422を返す", async () => {
		const { token, studentId } = await seedStudent();
		await seedCleared(studentId, 4);
		// くりかえしは「くりかえし終わり」の分も数えるので、命令5つ＋くりかえし2つで7枚
		const sevenCards: Program = [repeat(3, [forward]), { type: "right" }, repeat(6, [forward])];
		const eightCards: Program = times(8, forward);

		const accepted = await call("POST", "/me/tutorials/5/attempts", {
			token,
			body: { program: sevenCards },
		});
		const rejected = await call("POST", "/me/tutorials/5/attempts", {
			token,
			body: { program: eightCards },
		});

		expect(accepted.status).toBe(201);
		expect((await json<CompileResult>(accepted)).outcome).toBe("goal");
		expect(rejected.status).toBe(422);
		expect(await rejected.json()).toEqual(INVALID_INPUT);
	});
});

describe("POST /me/mazes/:mazeId/attempts", () => {
	it("自分の迷路なら、201でコンパイルの結果を返し、その迷路への挑戦として記録する", async () => {
		const { token, studentId } = await seedGraduate();
		const maze = await seedMaze(studentId);

		const res = await call("POST", `/me/mazes/${maze.id}/attempts`, {
			token,
			body: { program: SOLUTION },
		});
		const body = await json<CompileResult>(res);

		expect(res.status).toBe(201);
		expect(conforms(compileResultBody, body)).toBe(true);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(body).toEqual(compile(MAZE, SOLUTION));
		expect(body.outcome).toBe("goal");

		const recorded = (await findAttempts(studentId)).filter((attempt) => attempt.mazeId !== null);
		expect(recorded).toHaveLength(1);
		expect(recorded[0]).toMatchObject({
			studentId,
			tutorialNo: null,
			mazeId: maze.id,
			program: SOLUTION,
			succeeded: true,
		});
	});

	it("解けないプログラムは失敗として記録し、クリア数は変わらない", async () => {
		const { token, studentId } = await seedGraduate();
		const maze = await seedMaze(studentId, { data: TWO_FLOOR_MAZE });
		const program: Program = [forward, forward, forward];

		const res = await call("POST", `/me/mazes/${maze.id}/attempts`, { token, body: { program } });
		const body = await json<CompileResult>(res);

		expect(res.status).toBe(201);
		expect(body).toEqual(compile(TWO_FLOOR_MAZE, program));
		expect(body.outcome).not.toBe("goal");

		const recorded = (await findAttempts(studentId)).filter((attempt) => attempt.mazeId !== null);
		expect(recorded[0]).toMatchObject({ mazeId: maze.id, succeeded: false });

		const me = await call("GET", "/me", { token });
		expect((await json<{ clearedCount: number }>(me)).clearedCount).toBe(TUTORIALS.length);
	});

	it("自分の迷路には枚数の上限がない", async () => {
		const { token, studentId } = await seedGraduate();
		const maze = await seedMaze(studentId);

		const res = await call("POST", `/me/mazes/${maze.id}/attempts`, {
			token,
			body: { program: times(20, forward) },
		});

		expect(res.status).toBe(201);
	});

	it("他の児童の迷路は404を返し、記録しない", async () => {
		const { token, studentId } = await seedGraduate();
		const other = await seedGraduate();
		const othersMaze = await seedMaze(other.studentId);

		const res = await call("POST", `/me/mazes/${othersMaze.id}/attempts`, {
			token,
			body: { program: SOLUTION },
		});

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
		expect((await findAttempts(studentId)).filter((attempt) => attempt.mazeId !== null)).toEqual(
			[],
		);
	});

	it("存在しない迷路は404を返す", async () => {
		const { token } = await seedStudent();

		const res = await call("POST", `/me/mazes/${crypto.randomUUID()}/attempts`, {
			token,
			body: { program: SOLUTION },
		});

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("迷路のIDがUUIDでなければ422を返す", async () => {
		const { token } = await seedStudent();

		const res = await call("POST", "/me/mazes/not-a-uuid/attempts", {
			token,
			body: { program: SOLUTION },
		});

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it.each([
		...MALFORMED_PROGRAMS,
		{ name: "命令の数が101", program: TOO_MANY_COMMANDS },
		{ name: "くりかえしの入れ子が4段", program: TOO_DEEP },
	])("プログラムが$name: 422を返し、記録しない", async ({ program }) => {
		const { token, studentId } = sharedGraduate;
		const maze = sharedMaze;

		const res = await call("POST", `/me/mazes/${maze.id}/attempts`, { token, body: { program } });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
		expect((await findAttempts(studentId)).filter((attempt) => attempt.mazeId !== null)).toEqual(
			[],
		);
	});
});

describe("GET /me/mazes", () => {
	it("自分の迷路だけを、変えた時刻が新しい順（同じなら迷路のID順）に返す", async () => {
		const { token, studentId } = await seedStudent();
		const other = await seedStudent();
		const older = await seedMaze(studentId, { name: "ふるい", updatedAt: hoursFromNow(-2) });
		const sameTime = hoursFromNow(-1);
		const newerA = await seedMaze(studentId, { name: "あたらしい1", updatedAt: sameTime });
		const newerB = await seedMaze(studentId, {
			name: "あたらしい2",
			data: TWO_FLOOR_MAZE,
			updatedAt: sameTime,
		});
		await seedMaze(other.studentId, { name: "ほかのひと" });
		const [first, second] = [newerA, newerB].toSorted((a, b) => (a.id < b.id ? -1 : 1));

		const res = await call("GET", "/me/mazes", { token });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(conforms(mazesBody, body)).toBe(true);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(body).toEqual(
			[first, second, older].map((maze) => ({
				mazeId: maze?.id,
				name: maze?.name,
				data: maze?.data,
				updatedAt: maze?.updatedAt.toISOString(),
			})),
		);
	});

	it("迷路がなければ空の配列を返す", async () => {
		const { token } = await seedStudent();

		const res = await call("GET", "/me/mazes", { token });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(conforms(mazesBody, body)).toBe(true);
		expect(body).toEqual([]);
	});
});

describe("POST /me/mazes", () => {
	it("チュートリアルを全部クリアしていれば、201で迷路のIDを返して保存する", async () => {
		const { token, studentId } = await seedGraduate();

		const res = await call("POST", "/me/mazes", {
			token,
			body: { name: "はじめてのめいろ", data: TWO_FLOOR_MAZE },
		});
		const body = await json<{ mazeId: string }>(res);

		expect(res.status).toBe(201);
		expect(conforms(mazeIdBody, body)).toBe(true);
		expect(body.mazeId).toMatch(UUID_PATTERN);
		expect(res.headers.get("cache-control")).toBe("no-store");

		const saved = await findMazes(studentId);
		expect(saved).toHaveLength(1);
		expect(saved[0]).toMatchObject({
			id: body.mazeId,
			studentId,
			name: "はじめてのめいろ",
			data: TWO_FLOOR_MAZE,
		});
	});

	it("保存した迷路が、自分の迷路の一覧に出る", async () => {
		const { token } = await seedGraduate();
		const { mazeId } = await json<{ mazeId: string }>(
			await call("POST", "/me/mazes", { token, body: { name: "めいろ", data: MAZE } }),
		);

		const list = await json<unknown[]>(await call("GET", "/me/mazes", { token }));

		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ mazeId, name: "めいろ", data: MAZE });
	});

	it("迷路の名前は、前後の空白を削って保存する", async () => {
		const { token, studentId } = await seedGraduate();

		const res = await call("POST", "/me/mazes", {
			token,
			body: { name: ` 　${"あ".repeat(20)}　 `, data: MAZE },
		});

		expect(res.status).toBe(201);
		expect((await findMazes(studentId))[0]?.name).toBe("あ".repeat(20));
	});

	it("チュートリアルが一つでも残っていれば403を返し、保存しない", async () => {
		const { token, studentId } = await seedStudent();
		await seedCleared(studentId, TUTORIALS.length - 1);

		const res = await call("POST", "/me/mazes", { token, body: { name: "めいろ", data: MAZE } });

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual(MAZE_LOCKED);
		expect(await findMazes(studentId)).toEqual([]);
	});

	it.each(INVALID_NAMES)("迷路の名前が$name: 422を返す", async ({ value }) => {
		const { token } = sharedGraduate;

		const res = await call("POST", "/me/mazes", { token, body: { name: value, data: MAZE } });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it.each(MALFORMED_MAZES)("迷路が$name: 422を返す", async ({ data }) => {
		const { token } = sharedGraduate;

		const res = await call("POST", "/me/mazes", { token, body: { name: "めいろ", data } });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it.each(INVALID_MAZES)("迷路が$name: 422を返し、保存しない", async ({ data }) => {
		const { token, studentId } = sharedGraduate;

		const res = await call("POST", "/me/mazes", { token, body: { name: "めいろ", data } });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
		expect(await findMazes(studentId)).toEqual([sharedMaze]);
	});

	it("大きさの上限いっぱい（一辺7マス・3階）の迷路を保存できる", async () => {
		const { token } = await seedGraduate();
		const data: Maze = {
			startDirection: "east",
			layers: [
				[[START, GOAL, W, W, W, W, W], ...times(6, times(7, W))],
				wallFloor(7),
				wallFloor(7),
			],
		};

		const res = await call("POST", "/me/mazes", {
			token,
			body: { name: "おおきいめいろ", data },
		});

		expect(res.status).toBe(201);
	});
});

describe("PUT /me/mazes/:mazeId", () => {
	it("204を本文なしで返し、名前と迷路を丸ごと置き換え、変えた時刻を今の時刻にする", async () => {
		const { token, studentId } = await seedGraduate();
		const maze = await seedMaze(studentId, { name: "まえのなまえ", updatedAt: hoursFromNow(-1) });

		const res = await call("PUT", `/me/mazes/${maze.id}`, {
			token,
			body: { name: " あたらしいなまえ ", data: TWO_FLOOR_MAZE },
		});

		expect(res.status).toBe(204);
		expect(await res.text()).toBe("");
		expect(res.headers.get("cache-control")).toBe("no-store");

		const saved = only(await findMazes(studentId));
		expect(saved).toMatchObject({
			id: maze.id,
			name: "あたらしいなまえ",
			data: TWO_FLOOR_MAZE,
			createdAt: maze.createdAt,
		});
		expect(saved.updatedAt.getTime()).toBeGreaterThan(maze.updatedAt.getTime());
	});

	it("作りかえた後の挑戦は、新しい迷路でコンパイルする", async () => {
		const { token, studentId } = await seedGraduate();
		const maze = await seedMaze(studentId);
		// MAZEなら4回前に進めばゴール。作りかえた後の迷路では、南へ進むので同じプログラムでは着かない
		await call("PUT", `/me/mazes/${maze.id}`, {
			token,
			body: { name: "めいろ", data: TWO_FLOOR_MAZE },
		});

		const res = await call("POST", `/me/mazes/${maze.id}/attempts`, {
			token,
			body: { program: SOLUTION },
		});
		const body = await json<CompileResult>(res);

		expect(res.status).toBe(201);
		expect(body).toEqual(compile(TWO_FLOOR_MAZE, SOLUTION));
		expect(body.outcome).not.toBe("goal");
	});

	it("他の児童の迷路は404を返し、置き換えない", async () => {
		const { token } = await seedGraduate();
		const other = await seedGraduate();
		const othersMaze = await seedMaze(other.studentId, { name: "ほかのひと" });

		const res = await call("PUT", `/me/mazes/${othersMaze.id}`, {
			token,
			body: { name: "のっとり", data: TWO_FLOOR_MAZE },
		});

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
		expect(only(await findMazes(other.studentId))).toEqual(othersMaze);
	});

	it("存在しない迷路は404を返す", async () => {
		const { token } = await seedGraduate();

		const res = await call("PUT", `/me/mazes/${crypto.randomUUID()}`, {
			token,
			body: { name: "めいろ", data: MAZE },
		});

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("迷路のIDがUUIDでなければ422を返す", async () => {
		const { token } = await seedGraduate();

		const res = await call("PUT", "/me/mazes/not-a-uuid", {
			token,
			body: { name: "めいろ", data: MAZE },
		});

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it("チュートリアルが残っていれば403を返し、置き換えない（作るときと同じ検査を通す）", async () => {
		const { token, studentId } = await seedStudent();
		await seedCleared(studentId, TUTORIALS.length - 1);
		const maze = await seedMaze(studentId);

		const res = await call("PUT", `/me/mazes/${maze.id}`, {
			token,
			body: { name: "かえた", data: TWO_FLOOR_MAZE },
		});

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual(MAZE_LOCKED);
		expect(only(await findMazes(studentId))).toEqual(maze);
	});

	it.each(INVALID_NAMES)("迷路の名前が$name: 422を返す", async ({ value }) => {
		const { token } = sharedGraduate;
		const maze = sharedMaze;

		const res = await call("PUT", `/me/mazes/${maze.id}`, {
			token,
			body: { name: value, data: MAZE },
		});

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it.each([...MALFORMED_MAZES, ...INVALID_MAZES])(
		"迷路が$name: 422を返し、置き換えない",
		async ({ data }) => {
			const { token, studentId } = sharedGraduate;
			const maze = sharedMaze;

			const res = await call("PUT", `/me/mazes/${maze.id}`, {
				token,
				body: { name: "かえた", data },
			});

			expect(res.status).toBe(422);
			expect(await res.json()).toEqual(INVALID_INPUT);
			expect(only(await findMazes(studentId))).toEqual(maze);
		},
	);
});

describe("DELETE /me/mazes/:mazeId", () => {
	it("204を本文なしで返し、迷路と、その迷路への挑戦の記録を消す", async () => {
		const { token, studentId } = await seedGraduate();
		const maze = await seedMaze(studentId);
		const kept = await seedMaze(studentId, { name: "のこす" });
		await db.insert(attempts).values([
			{ studentId, mazeId: maze.id, program: SOLUTION, succeeded: true },
			{ studentId, mazeId: kept.id, program: SOLUTION, succeeded: true },
		]);

		const res = await call("DELETE", `/me/mazes/${maze.id}`, { token });

		expect(res.status).toBe(204);
		expect(await res.text()).toBe("");
		expect(res.headers.get("cache-control")).toBe("no-store");

		expect(await findMazes(studentId)).toEqual([kept]);
		const recorded = await findAttempts(studentId);
		expect(recorded.filter((attempt) => attempt.mazeId === maze.id)).toEqual([]);
		expect(recorded.filter((attempt) => attempt.mazeId === kept.id)).toHaveLength(1);
		// チュートリアルの記録は残る
		expect(recorded.filter((attempt) => attempt.tutorialNo !== null)).toHaveLength(
			TUTORIALS.length,
		);
	});

	it("他の児童の迷路は404を返し、消さない", async () => {
		const { token } = await seedGraduate();
		const other = await seedGraduate();
		const othersMaze = await seedMaze(other.studentId);

		const res = await call("DELETE", `/me/mazes/${othersMaze.id}`, { token });

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
		expect(await findMazes(other.studentId)).toEqual([othersMaze]);
	});

	it("存在しない迷路は404を返す", async () => {
		const { token } = await seedStudent();

		const res = await call("DELETE", `/me/mazes/${crypto.randomUUID()}`, { token });

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("迷路のIDがUUIDでなければ422を返す", async () => {
		const { token } = await seedStudent();

		const res = await call("DELETE", "/me/mazes/not-a-uuid", { token });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it("迷路のIDにurn:uuid:が付いていれば422を返し、消さない", async () => {
		const { token } = sharedGraduate;

		const res = await call("DELETE", `/me/mazes/urn:uuid:${sharedMaze.id}`, { token });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(await findMazes(sharedGraduate.studentId)).toEqual([sharedMaze]);
	});
});
