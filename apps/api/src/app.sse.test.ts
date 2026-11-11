/*
 * サーバーからの知らせ（SSE）のコントラクトテスト（仕様書backend.mdの「サーバーからの知らせ（SSE）」「エラーの応答」「アクセス制御」）
 * `app.handle()`でつなぎ、表のとおりの知らせが届くことと、他の授業・他の児童には届かないことを確かめる
 * 空の知らせは、決定に合わせて`{ event: "ping", data: null }`として届く
 */
import { afterEach, beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import type { Cell, Command, CompileResult, Maze, Program } from "@kasane/core";
import { FLOOR, GOAL, START, TUTORIALS, WALL, compile } from "@kasane/core";
import { eq, sql } from "drizzle-orm";
import { getSchemaValidator } from "elysia";
import type { TSchema } from "elysia";

import { PING_INTERVAL_MS, createApp } from "./app";
import { generateToken, hashToken } from "./domain/services/token";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "./infrastructure/database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "./infrastructure/database/schema";
import {
	compileResultBody,
	studentEventBody,
	studentStatusBody,
	teacherEventBody,
} from "./presentation/schemas";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(30_000);

// テストでは、空の知らせを待つ時間を短くする
const app = createApp({ db, pingIntervalMs: 50 });

const UNAUTHORIZED = { code: "unauthorized" };
const NOT_FOUND = { code: "notFound" };
const LESSON_ENDED = { code: "lessonEnded" };
const INVALID_INPUT = { code: "invalidInput" };

const PING = { event: "ping", data: null };
const ENDED = { event: "ended", data: null };

type CallOptions = { token?: string; body?: unknown };

type TestApp = ReturnType<typeof createApp>;

const callOn = (target: TestApp, method: string, path: string, { token, body }: CallOptions = {}) =>
	target.handle(
		new Request(`http://localhost${path}`, {
			method,
			headers: {
				...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
				...(body === undefined ? {} : { "content-type": "application/json" }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
	);

const call = (method: string, path: string, options: CallOptions = {}) =>
	callOn(app, method, path, options);

// 応答の本文を、読みたい項目の型を付けて取り出す（中身は期待値と応答スキーマで確かめる）
const json = async <Body>(res: Response): Promise<Body> => (await res.json()) as Body;

// 値が、ルートの応答スキーマに合うか
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

// 一辺5マス・1階の迷路。スタートから東へ4マス進むとゴール
const MAZE_FLOOR: Cell[][] = [
	[START, F, F, F, GOAL],
	times(5, W),
	times(5, W),
	times(5, W),
	times(5, W),
];
const MAZE: Maze = { startDirection: "east", layers: [MAZE_FLOOR] };
// チュートリアル1と上の迷路を解けるプログラム
const SOLUTION: Program = times(4, forward);
// どちらも解けないプログラム
const WRONG: Program = [forward];

// チュートリアルnoの迷路
const tutorialMaze = (no: number): Maze => {
	const tutorial = TUTORIALS[no - 1];
	if (!tutorial) throw new Error(`チュートリアル${no}がありません`);
	return tutorial.maze;
};

// SSEの読み取り

type Received = { event: string; data: unknown };

type Stream = {
	res: Response;
	// 次の知らせを一つ読む。接続が閉じていればnull
	next(): Promise<Received | null>;
	// 空の知らせを読み飛ばして、次の知らせを一つ読む。接続が閉じていればnull
	nextExceptPing(): Promise<Received | null>;
	// 次の知らせをcount件読む
	take(count: number): Promise<(Received | null)[]>;
	cancel(): Promise<void>;
};

// 「event: 名前」と「data: JSON」の2行でできた1件を読む
const parseEvent = (block: string): Received => {
	const field = (name: string) => {
		const line = block.split("\n").find((candidate) => candidate.startsWith(`${name}: `));
		if (line === undefined) throw new Error(`${name}の行がありません: ${block}`);
		return line.slice(name.length + 2);
	};
	return { event: field("event"), data: JSON.parse(field("data")) as unknown };
};

// テストの終わりに、開いたままの接続を切る
const opened: Stream[] = [];

const open = async (path: string, token: string, target: TestApp = app): Promise<Stream> => {
	const res = await callOn(target, "GET", path, { token });
	if (res.status !== 200 || res.body === null) {
		throw new Error(`つなげませんでした: ${res.status} ${await res.text()}`);
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let cancelled = false;

	const next = async (): Promise<Received | null> => {
		for (;;) {
			// 1件は空行で区切られている
			const end = buffer.indexOf("\n\n");
			if (end !== -1) {
				const block = buffer.slice(0, end);
				buffer = buffer.slice(end + 2);
				return parseEvent(block);
			}
			// app.handle()の応答は、かたまりが文字列で届くこともバイト列で届くこともある
			const { done, value }: { done: boolean; value?: string | Uint8Array } = await reader.read();
			if (done || value === undefined) return null;
			buffer += typeof value === "string" ? value : decoder.decode(value, { stream: true });
		}
	};

	const stream: Stream = {
		res,
		next,
		async nextExceptPing() {
			for (;;) {
				const event = await next();
				if (event === null || event.event !== "ping") return event;
			}
		},
		async take(count) {
			const events: (Received | null)[] = [];
			for (let index = 0; index < count; index += 1) events.push(await next());
			return events;
		},
		async cancel() {
			if (cancelled) return;
			cancelled = true;
			await reader.cancel();
		},
	};
	opened.push(stream);
	return stream;
};

const openAsTeacher = (lessonId: string, token: string, target: TestApp = app) =>
	open(`/lessons/${lessonId}/events`, token, target);
const openAsStudent = (token: string, target: TestApp = app) => open("/me/events", token, target);

// データの用意

// 教師を作り、そのトークン（DBにはハッシュだけを入れる）を返す
const seedTeacher = async () => {
	const token = generateToken();
	const teacher = only(
		await db
			.insert(teachers)
			.values({ tokenHash: hashToken(token) })
			.returning(),
	);
	return { token, teacherId: teacher.id };
};

// 開いている授業（1時間後に終わる）を作る
const seedLesson = async (teacherId: string) =>
	only(
		await db
			.insert(lessons)
			.values({ teacherId, endsAt: hoursFromNow(1) })
			.returning(),
	).id;

// 終わっている授業（1時間前に終わった）を作る
const seedEndedLesson = async (teacherId: string) =>
	only(
		await db
			.insert(lessons)
			.values({ teacherId, createdAt: hoursFromNow(-6), endsAt: hoursFromNow(-1) })
			.returning(),
	).id;

// 児童の行を直接作る（教師への知らせは送られない）
const seedStudent = async (lessonId: string, name = "たろう") => {
	const token = generateToken();
	const student = only(
		await db
			.insert(students)
			.values({ lessonId, name, tokenHash: hashToken(token) })
			.returning(),
	);
	return { token, studentId: student.id };
};

// チュートリアルを全部クリアしたことにする
const seedAllCleared = async (studentId: string) => {
	await db.insert(attempts).values(
		TUTORIALS.map((_, index) => ({
			studentId,
			tutorialNo: index + 1,
			program: [],
			succeeded: true,
		})),
	);
};

const seedMaze = async (studentId: string) =>
	only(await db.insert(mazes).values({ studentId, name: "めいろ", data: MAZE }).returning()).id;

// 授業QRを読み取った児童として、APIで参加する
const join = async (lessonId: string, name = "たろう") => {
	const res = await call("POST", "/students", { body: { lessonId, name } });
	if (res.status !== 201) throw new Error(`参加できませんでした: ${res.status}`);
	const { token } = await json<{ token: string }>(res);
	const student = only(
		await db
			.select()
			.from(students)
			.where(eq(students.tokenHash, hashToken(token))),
	);
	return { token, studentId: student.id };
};

const sendTutorial = (token: string, no: number, program: Program) =>
	call("POST", `/me/tutorials/${no}/attempts`, { token, body: { program } });

const sendMaze = (token: string, mazeId: string, program: Program) =>
	call("POST", `/me/mazes/${mazeId}/attempts`, { token, body: { program } });

let teacher: { token: string; teacherId: string };
let otherTeacher: { token: string; teacherId: string };

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);

	[teacher, otherTeacher] = await Promise.all([seedTeacher(), seedTeacher()]);
});

afterEach(async () => {
	await Promise.all(opened.splice(0).map((stream) => stream.cancel()));
});

describe("テストの前提", () => {
	it("SOLUTIONはチュートリアル1と迷路を解け、WRONGはどちらも解けない", () => {
		expect(compile(tutorialMaze(1), SOLUTION).outcome).toBe("goal");
		expect(compile(MAZE, SOLUTION).outcome).toBe("goal");
		expect(compile(tutorialMaze(1), WRONG).outcome).not.toBe("goal");
		expect(compile(tutorialMaze(2), WRONG).outcome).not.toBe("goal");
		expect(compile(MAZE, WRONG).outcome).not.toBe("goal");
	});
});

describe("GET /lessons/:lessonId/events（教師用）", () => {
	describe("つなぐ前の確認", () => {
		it("トークンがなければ、401で接続を始めない", async () => {
			const lessonId = await seedLesson(teacher.teacherId);

			const res = await call("GET", `/lessons/${lessonId}/events`);

			expect(res.status).toBe(401);
			expect(res.headers.get("www-authenticate")).toBe("Bearer");
			expect(res.headers.get("content-type")).not.toContain("text/event-stream");
			expect(await res.json()).toEqual(UNAUTHORIZED);
		});

		it("児童のトークンでは、401で接続を始めない", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId);

			const res = await call("GET", `/lessons/${lessonId}/events`, { token: student.token });

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual(UNAUTHORIZED);
		});

		it("他の教師の授業は、404で接続を始めない", async () => {
			const lessonId = await seedLesson(otherTeacher.teacherId);

			const res = await call("GET", `/lessons/${lessonId}/events`, { token: teacher.token });

			expect(res.status).toBe(404);
			expect(res.headers.get("content-type")).not.toContain("text/event-stream");
			expect(await res.json()).toEqual(NOT_FOUND);
		});

		it("他の教師の授業は、終わっていても404（存在するかどうかを漏らさない）", async () => {
			const lessonId = await seedEndedLesson(otherTeacher.teacherId);

			const res = await call("GET", `/lessons/${lessonId}/events`, { token: teacher.token });

			expect(res.status).toBe(404);
			expect(await res.json()).toEqual(NOT_FOUND);
		});

		it("存在しない授業は、404で接続を始めない", async () => {
			const res = await call("GET", `/lessons/${crypto.randomUUID()}/events`, {
				token: teacher.token,
			});

			expect(res.status).toBe(404);
			expect(await res.json()).toEqual(NOT_FOUND);
		});

		it("授業のIDの形が正しくなければ、422", async () => {
			const res = await call("GET", "/lessons/not-a-uuid/events", { token: teacher.token });

			expect(res.status).toBe(422);
			expect(await res.json()).toEqual(INVALID_INPUT);
		});

		it("終わっている授業は、410で接続を始めない", async () => {
			const lessonId = await seedEndedLesson(teacher.teacherId);

			const res = await call("GET", `/lessons/${lessonId}/events`, { token: teacher.token });

			expect(res.status).toBe(410);
			expect(res.headers.get("content-type")).not.toContain("text/event-stream");
			expect(res.headers.get("cache-control")).toBe("no-store");
			expect(await res.json()).toEqual(LESSON_ENDED);
		});
	});

	describe("つないだ直後", () => {
		it("SSEの応答として、全児童の状態をsnapshotで送る", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const beginner = await seedStudent(lessonId, "たろう");
			const failing = await seedStudent(lessonId, "じろう");
			await db.insert(attempts).values([
				{ studentId: failing.studentId, tutorialNo: 1, program: [], succeeded: true },
				{ studentId: failing.studentId, tutorialNo: 2, program: [], succeeded: false },
			]);

			const stream = await openAsTeacher(lessonId, teacher.token);
			const snapshot = await stream.next();

			expect(stream.res.status).toBe(200);
			expect(stream.res.headers.get("content-type")).toContain("text/event-stream");
			expect(stream.res.headers.get("cache-control")).toBe("no-store");
			expect(conforms(teacherEventBody, snapshot)).toBe(true);
			expect(snapshot?.event).toBe("snapshot");
			expect(snapshot?.data).toBeArrayOfSize(2);
			expect(snapshot?.data).toContainEqual({
				studentId: beginner.studentId,
				name: "たろう",
				clearedCount: 0,
				lastResult: "notSent",
			});
			expect(snapshot?.data).toContainEqual({
				studentId: failing.studentId,
				name: "じろう",
				clearedCount: 1,
				lastResult: "failed",
			});
		});

		it("児童がいない授業では、空のsnapshotを送る", async () => {
			const lessonId = await seedLesson(teacher.teacherId);

			const stream = await openAsTeacher(lessonId, teacher.token);

			expect(await stream.next()).toEqual({ event: "snapshot", data: [] });
		});

		it("他の授業の児童を、snapshotに含めない", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const otherLessonId = await seedLesson(teacher.teacherId);
			await seedStudent(otherLessonId, "よその子");

			const stream = await openAsTeacher(lessonId, teacher.token);

			expect(await stream.next()).toEqual({ event: "snapshot", data: [] });
		});
	});

	describe("児童が参加したとき・プログラムを送ったとき", () => {
		it("児童が参加すると、その児童の状態がstudentで届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();

			const student = await join(lessonId, "はなこ");
			const event = await stream.nextExceptPing();

			expect(conforms(teacherEventBody, event)).toBe(true);
			expect(event).toEqual({
				event: "student",
				data: {
					studentId: student.studentId,
					name: "はなこ",
					clearedCount: 0,
					lastResult: "notSent",
				},
			});
		});

		it("児童がチュートリアルを解くと、応答でコンパイルの結果が返り、教師にその児童の状態が届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId, "たろう");
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();

			const res = await sendTutorial(student.token, 1, SOLUTION);
			const body = await json<CompileResult>(res);
			const event = await stream.nextExceptPing();

			expect(res.status).toBe(201);
			expect(conforms(compileResultBody, body)).toBe(true);
			expect(body).toEqual(compile(tutorialMaze(1), SOLUTION));
			expect(conforms(teacherEventBody, event)).toBe(true);
			expect(conforms(studentStatusBody, event?.data)).toBe(true);
			// クリアすると次の問題へ移るので、今の問題（チュートリアル2）はまだ送っていない
			expect(event).toEqual({
				event: "student",
				data: {
					studentId: student.studentId,
					name: "たろう",
					clearedCount: 1,
					lastResult: "notSent",
				},
			});
		});

		it("児童がチュートリアルに失敗すると、失敗の状態が届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId, "たろう");
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();

			const res = await sendTutorial(student.token, 1, WRONG);
			const event = await stream.nextExceptPing();

			expect(res.status).toBe(201);
			expect(event).toEqual({
				event: "student",
				data: {
					studentId: student.studentId,
					name: "たろう",
					clearedCount: 0,
					lastResult: "failed",
				},
			});
		});

		it("送るたびに、その時点の状態全体が順に届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId, "たろう");
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();
			const status = { studentId: student.studentId, name: "たろう" };

			await sendTutorial(student.token, 1, WRONG);
			await sendTutorial(student.token, 1, SOLUTION);
			await sendTutorial(student.token, 2, WRONG);

			expect(await stream.nextExceptPing()).toEqual({
				event: "student",
				data: { ...status, clearedCount: 0, lastResult: "failed" },
			});
			expect(await stream.nextExceptPing()).toEqual({
				event: "student",
				data: { ...status, clearedCount: 1, lastResult: "notSent" },
			});
			expect(await stream.nextExceptPing()).toEqual({
				event: "student",
				data: { ...status, clearedCount: 1, lastResult: "failed" },
			});
		});

		it("児童が自分の迷路を送ると、応答でコンパイルの結果が返り、教師にその児童の状態が届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId, "たろう");
			await seedAllCleared(student.studentId);
			const mazeId = await seedMaze(student.studentId);
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();
			const status = {
				studentId: student.studentId,
				name: "たろう",
				clearedCount: TUTORIALS.length,
			};

			const failed = await sendMaze(student.token, mazeId, WRONG);
			const solved = await sendMaze(student.token, mazeId, SOLUTION);
			const body = await json<CompileResult>(solved);

			expect(failed.status).toBe(201);
			expect(solved.status).toBe(201);
			expect(conforms(compileResultBody, body)).toBe(true);
			expect(body).toEqual(compile(MAZE, SOLUTION));
			expect(await stream.nextExceptPing()).toEqual({
				event: "student",
				data: { ...status, lastResult: "failed" },
			});
			expect(await stream.nextExceptPing()).toEqual({
				event: "student",
				data: { ...status, lastResult: "succeeded" },
			});
		});

		it("同じ教師が複数つないでいれば、それぞれに届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const firstTab = await openAsTeacher(lessonId, teacher.token);
			const secondTab = await openAsTeacher(lessonId, teacher.token);
			await firstTab.next();
			await secondTab.next();

			const student = await join(lessonId, "はなこ");

			const expected = {
				event: "student",
				data: {
					studentId: student.studentId,
					name: "はなこ",
					clearedCount: 0,
					lastResult: "notSent",
				},
			};
			expect(await firstTab.nextExceptPing()).toEqual(expected);
			expect(await secondTab.nextExceptPing()).toEqual(expected);
		});

		it("同じ教師の別の授業の児童の状態は届かない", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const otherLessonId = await seedLesson(teacher.teacherId);
			const outsider = await seedStudent(otherLessonId, "よその子");
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();

			// 別の授業での参加と送信の後に、この授業で参加する
			await join(otherLessonId, "よその子2");
			await sendTutorial(outsider.token, 1, SOLUTION);
			const student = await join(lessonId, "はなこ");

			// 別の授業の分が届いていれば、先にそちらが読める
			expect(await stream.nextExceptPing()).toEqual({
				event: "student",
				data: {
					studentId: student.studentId,
					name: "はなこ",
					clearedCount: 0,
					lastResult: "notSent",
				},
			});
		});

		it("他の教師の授業の児童の状態は届かない", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const otherLessonId = await seedLesson(otherTeacher.teacherId);
			const outsider = await seedStudent(otherLessonId, "よその子");
			const stream = await openAsTeacher(lessonId, teacher.token);
			const otherStream = await openAsTeacher(otherLessonId, otherTeacher.token);
			await stream.next();
			await otherStream.next();

			await sendTutorial(outsider.token, 1, WRONG);
			const student = await join(lessonId, "はなこ");

			expect(await stream.nextExceptPing()).toEqual({
				event: "student",
				data: {
					studentId: student.studentId,
					name: "はなこ",
					clearedCount: 0,
					lastResult: "notSent",
				},
			});
			// 他の教師には、その教師の授業の児童の状態だけが届く
			expect(await otherStream.nextExceptPing()).toEqual({
				event: "student",
				data: {
					studentId: outsider.studentId,
					name: "よその子",
					clearedCount: 0,
					lastResult: "failed",
				},
			});
		});

		it("教師がつないでいなくても、児童の参加と送信は201を返す", async () => {
			const lessonId = await seedLesson(teacher.teacherId);

			const joined = await call("POST", "/students", { body: { lessonId, name: "たろう" } });
			const { token } = await json<{ token: string }>(joined);
			const sent = await sendTutorial(token, 1, SOLUTION);

			expect(joined.status).toBe(201);
			expect(sent.status).toBe(201);
		});

		it("教師が接続を切った後も、児童の送信は201を返す", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId);
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();

			await stream.cancel();
			const sent = await sendTutorial(student.token, 1, SOLUTION);

			expect(sent.status).toBe(201);
		});
	});

	describe("空の知らせ", () => {
		it("何も起きなくても、決めた間隔ごとに空の知らせが届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const stream = await openAsTeacher(lessonId, teacher.token);
			await stream.next();

			const events = await stream.take(3);

			expect(events).toEqual([PING, PING, PING]);
			expect(events.every((event) => conforms(teacherEventBody, event))).toBe(true);
		});
	});
});

describe("GET /me/events（児童用）", () => {
	describe("つなぐ前の確認", () => {
		it("トークンがなければ、401で接続を始めない", async () => {
			const res = await call("GET", "/me/events");

			expect(res.status).toBe(401);
			expect(res.headers.get("www-authenticate")).toBe("Bearer");
			expect(res.headers.get("content-type")).not.toContain("text/event-stream");
			expect(await res.json()).toEqual(UNAUTHORIZED);
		});

		it("教師のトークンでは、401で接続を始めない", async () => {
			const res = await call("GET", "/me/events", { token: teacher.token });

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual(UNAUTHORIZED);
		});

		it("終わっている授業は、410で接続を始めない", async () => {
			const lessonId = await seedEndedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId);

			const res = await call("GET", "/me/events", { token: student.token });

			expect(res.status).toBe(410);
			expect(res.headers.get("content-type")).not.toContain("text/event-stream");
			expect(res.headers.get("cache-control")).toBe("no-store");
			expect(await res.json()).toEqual(LESSON_ENDED);
		});
	});

	describe("つないだ後", () => {
		it("SSEの応答として、空の知らせだけが届く", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId);

			const stream = await openAsStudent(student.token);
			const events = await stream.take(3);

			expect(stream.res.status).toBe(200);
			expect(stream.res.headers.get("content-type")).toContain("text/event-stream");
			expect(stream.res.headers.get("cache-control")).toBe("no-store");
			expect(events).toEqual([PING, PING, PING]);
			expect(events.every((event) => conforms(studentEventBody, event))).toBe(true);
		});

		it("他の児童が参加しても、プログラムを送っても、児童には空の知らせしか届かない", async () => {
			const lessonId = await seedLesson(teacher.teacherId);
			const student = await seedStudent(lessonId, "たろう");
			const classmate = await seedStudent(lessonId, "じろう");
			// 教師がつないでいて、児童の状態が実際に送られている状況にする
			const teacherStream = await openAsTeacher(lessonId, teacher.token);
			await teacherStream.next();
			const stream = await openAsStudent(student.token);

			await join(lessonId, "はなこ");
			await sendTutorial(classmate.token, 1, SOLUTION);
			await sendTutorial(student.token, 1, WRONG);

			// 教師には3件とも届いている
			const delivered = [
				await teacherStream.nextExceptPing(),
				await teacherStream.nextExceptPing(),
				await teacherStream.nextExceptPing(),
			];
			expect(delivered.map((event) => event?.event)).toEqual(["student", "student", "student"]);
			// 児童には、その後も空の知らせしか届かない
			expect(await stream.take(5)).toEqual([PING, PING, PING, PING, PING]);
		});
	});
});

describe("授業が終わったとき", () => {
	it("教師が授業を終えると、その授業の教師と児童の全員にendedが届き、接続が閉じる", async () => {
		const lessonId = await seedLesson(teacher.teacherId);
		const student = await seedStudent(lessonId, "たろう");
		const classmate = await seedStudent(lessonId, "じろう");
		// 押した教師の接続も含めて、教師は二つつないでいる
		const streams = await Promise.all([
			openAsTeacher(lessonId, teacher.token),
			openAsTeacher(lessonId, teacher.token),
			openAsStudent(student.token),
			openAsStudent(classmate.token),
		]);

		const res = await call("POST", `/lessons/${lessonId}/close`, { token: teacher.token });

		expect(res.status).toBe(204);
		for (const stream of streams) {
			const ended = await stream.nextExceptPing();
			// 教師用のsnapshotは読み飛ばす
			const event = ended?.event === "snapshot" ? await stream.nextExceptPing() : ended;

			expect(event).toEqual(ENDED);
			expect(conforms(teacherEventBody, event)).toBe(true);
			expect(conforms(studentEventBody, event)).toBe(true);
			// endedを送った後は、接続を閉じる
			expect(await stream.next()).toBeNull();
		}
	});

	it("他の授業の教師と児童には、endedが届かない", async () => {
		const lessonId = await seedLesson(teacher.teacherId);
		const otherLessonId = await seedLesson(teacher.teacherId);
		const outsider = await seedStudent(otherLessonId, "よその子");
		const otherTeacherStream = await openAsTeacher(otherLessonId, teacher.token);
		const outsiderStream = await openAsStudent(outsider.token);
		await otherTeacherStream.next();

		const res = await call("POST", `/lessons/${lessonId}/close`, { token: teacher.token });

		expect(res.status).toBe(204);
		// 別の授業の接続は続いていて、空の知らせしか届かない
		expect(await otherTeacherStream.take(3)).toEqual([PING, PING, PING]);
		expect(await outsiderStream.take(3)).toEqual([PING, PING, PING]);
	});

	it("教師が授業を終えた後は、教師も児童も410でつなげない", async () => {
		const lessonId = await seedLesson(teacher.teacherId);
		const student = await seedStudent(lessonId);

		await call("POST", `/lessons/${lessonId}/close`, { token: teacher.token });
		const asTeacher = await call("GET", `/lessons/${lessonId}/events`, { token: teacher.token });
		const asStudent = await call("GET", "/me/events", { token: student.token });

		expect(asTeacher.status).toBe(410);
		expect(await asTeacher.json()).toEqual(LESSON_ENDED);
		expect(asStudent.status).toBe(410);
		expect(await asStudent.json()).toEqual(LESSON_ENDED);
	});

	it("授業が終わる時刻を過ぎると、教師が終えなくても、空の知らせの代わりにendedが届いて接続が閉じる", async () => {
		// 終わる時刻を待たずに確かめるために、SSEの接続が見る時刻だけを進められるアプリを使う
		let elapsedMs = 0;
		const clockApp = createApp({
			db,
			pingIntervalMs: 50,
			now: () => new Date(Date.now() + elapsedMs),
		});
		// 1時間後に終わる授業
		const lessonId = await seedLesson(teacher.teacherId);
		const student = await seedStudent(lessonId);
		const teacherStream = await openAsTeacher(lessonId, teacher.token, clockApp);
		const studentStream = await openAsStudent(student.token, clockApp);
		await teacherStream.next();

		// 終わる時刻より前は、空の知らせだけが届く
		expect(await teacherStream.take(2)).toEqual([PING, PING]);
		expect(await studentStream.take(2)).toEqual([PING, PING]);

		// 2時間進めて、終わる時刻を過ぎたことにする
		elapsedMs = 2 * 60 * 60 * 1000;

		for (const stream of [teacherStream, studentStream]) {
			expect(await stream.nextExceptPing()).toEqual(ENDED);
			expect(await stream.next()).toBeNull();
		}
	});
});

describe("空の知らせの間隔", () => {
	it("本番の間隔は、10秒未満", () => {
		expect(PING_INTERVAL_MS).toBeLessThan(10_000);
	});
});
