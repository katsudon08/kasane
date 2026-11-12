/*
 * 問題を飛ばすAPIのコントラクトテスト（仕様書backend.mdの「HTTPのAPI」のPOST /me/tutorials/skip、「教師に見せる状態の求め方」、
 * README.mdの「問題を飛ばす」）
 * - to問目から始められるよう、1〜to - 1問目をクリアしたことにする。toは2〜チュートリアルの数＋1（＋1は全部飛ばす）
 * - 減らすことはない。飛ばした後に解いた問題は、飛ばした数の続きとして数える
 * - 飛ばしたことはattemptsに入れない
 */
import { beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import type { Command, Program } from "@kasane/core";
import { TUTORIALS } from "@kasane/core";
import { eq, sql } from "drizzle-orm";

import { createApp } from "./app";
import { generateToken, hashToken } from "./domain/services/token";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "./infrastructure/database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "./infrastructure/database/schema";
import { studentRepository } from "./infrastructure/repositories/student-repository";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(60_000);

const app = createApp({ db });

const UNAUTHORIZED = { code: "unauthorized" };
const LESSON_ENDED = { code: "lessonEnded" };
const INVALID_INPUT = { code: "invalidInput" };

const ALL_SKIPPED = TUTORIALS.length + 1;

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

const skip = (token: string, to: unknown) =>
	call("POST", "/me/tutorials/skip", { token, body: { to } });

const clearedCountOf = async (token: string): Promise<number> => {
	const res = await call("GET", "/me", { token });
	const body = (await res.json()) as { clearedCount: number };
	return body.clearedCount;
};

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("行が返されませんでした");
	return row;
};

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const fill: Command = { type: "fill" };

// domain.mdの4問目の解答の例: うめる、前×3、うめる、前、右、前×2、うめる、前×2
const TUTORIAL_4_SOLUTION: Program = [
	fill,
	forward,
	forward,
	forward,
	fill,
	forward,
	right,
	forward,
	forward,
	fill,
	forward,
	forward,
];

// 一辺5マス・1階の、スタートから東へ4マス進むとゴールの迷路
const MAZE = {
	startDirection: "east",
	layers: [
		[
			["start", "floor", "floor", "floor", "goal"],
			["wall", "wall", "wall", "wall", "wall"],
			["wall", "wall", "wall", "wall", "wall"],
			["wall", "wall", "wall", "wall", "wall"],
			["wall", "wall", "wall", "wall", "wall"],
		],
	],
};

let openLessonId: string;
let endedLessonId: string;

const seedStudent = async (lessonId: string = openLessonId) => {
	const token = generateToken();
	const student = only(
		await db
			.insert(students)
			.values({ lessonId, name: "たろう", tokenHash: hashToken(token) })
			.returning(),
	);
	return { token, studentId: student.id };
};

// チュートリアルの1問目からcount問目までを、解いてクリアしたことにする
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

const findAttempts = (studentId: string) =>
	db.select().from(attempts).where(eq(attempts.studentId, studentId));

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);

	const teacher = only(
		await db
			.insert(teachers)
			.values({ tokenHash: hashToken(generateToken()) })
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
});

describe("POST /me/tutorials/skip", () => {
	it("204を本文なしで返し、to - 1問目までをクリアしたことにする", async () => {
		const { token } = await seedStudent();

		const res = await skip(token, 4);

		expect(res.status).toBe(204);
		expect(await res.text()).toBe("");
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(await clearedCountOf(token)).toBe(3);
	});

	it("飛ばしたことは、挑戦の記録に入れない", async () => {
		const { token, studentId } = await seedStudent();

		await skip(token, 5);

		expect(await findAttempts(studentId)).toEqual([]);
	});

	it("to問目は解放され、その次の問題はまだ解放されない", async () => {
		const { token } = await seedStudent();
		await skip(token, 4);

		const unlocked = await call("POST", "/me/tutorials/4/attempts", {
			token,
			body: { program: [forward] },
		});
		const locked = await call("POST", "/me/tutorials/5/attempts", {
			token,
			body: { program: [forward] },
		});

		expect(unlocked.status).toBe(201);
		expect(locked.status).toBe(403);
	});

	it("飛ばした後に解いた問題は、飛ばした数の続きとして数える", async () => {
		const { token, studentId } = await seedStudent();
		// 1問目だけ解いてから、4問目まで飛ばす（1問目は二重に数えない）
		await seedCleared(studentId, 1);
		await skip(token, 4);

		const res = await call("POST", "/me/tutorials/4/attempts", {
			token,
			body: { program: TUTORIAL_4_SOLUTION },
		});

		expect(((await res.json()) as { outcome: string }).outcome).toBe("goal");
		expect(await clearedCountOf(token)).toBe(4);
	});

	it("全部飛ばすと全部クリアしたことになり、自分の迷路を作れる", async () => {
		const { token } = await seedStudent();

		await skip(token, ALL_SKIPPED);
		const created = await call("POST", "/me/mazes", {
			token,
			body: { name: "めいろ", data: MAZE },
		});

		expect(await clearedCountOf(token)).toBe(TUTORIALS.length);
		expect(created.status).toBe(201);
	});

	it("前より手前を選んでも、クリア数は減らない", async () => {
		const { token } = await seedStudent();
		await skip(token, 6);

		const res = await skip(token, 3);

		expect(res.status).toBe(204);
		expect(await clearedCountOf(token)).toBe(5);
	});

	it("解いてクリアした数より手前を選んでも、クリア数は減らない", async () => {
		const { token, studentId } = await seedStudent();
		await seedCleared(studentId, 4);

		await skip(token, 3);

		expect(await clearedCountOf(token)).toBe(4);
	});

	it("同じtoを何度送っても、同じ結果になる", async () => {
		const { token } = await seedStudent();

		await skip(token, 4);
		await skip(token, 4);

		expect(await clearedCountOf(token)).toBe(3);
	});

	it("他の児童のクリア数は変わらない", async () => {
		const { token } = await seedStudent();
		const other = await seedStudent();

		await skip(token, ALL_SKIPPED);

		expect(await clearedCountOf(other.token)).toBe(0);
	});

	it("教師に見せる状態は、飛ばした後のクリア数で、今の問題はまだ送っていない", async () => {
		const { token, studentId } = await seedStudent();
		// 1問目で失敗した記録がある（飛ばした後の今の問題ではないので、結果に使わない）
		await db.insert(attempts).values({ studentId, tutorialNo: 1, program: [], succeeded: false });

		await skip(token, 4);
		const status = await studentRepository(db).findStatus(studentId);

		expect(status).toEqual({ studentId, name: "たろう", clearedCount: 3, lastResult: "notSent" });
	});

	it.each([
		{ name: "1（最初の問題より前）", to: 1 },
		{ name: "0", to: 0 },
		{ name: "チュートリアルの数＋2", to: TUTORIALS.length + 2 },
		{ name: "整数ではない", to: 2.5 },
		// 数字だけの文字列（"3"）は、Elysiaが数に直してから検証するので通る（他のルートの整数と同じ）
		{ name: "数字でない文字列", to: "three" },
	])("toが$nameなら422を返し、飛ばさない", async ({ to }) => {
		const { token } = await seedStudent();

		const res = await skip(token, to);

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
		expect(await clearedCountOf(token)).toBe(0);
	});

	it("本文にtoがなければ422を返す", async () => {
		const { token } = await seedStudent();

		const res = await call("POST", "/me/tutorials/skip", { token, body: {} });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});

	it("トークンがなければ401を返す", async () => {
		const res = await call("POST", "/me/tutorials/skip", { body: { to: 3 } });

		expect(res.status).toBe(401);
		expect(res.headers.get("www-authenticate")).toBe("Bearer");
		expect(await res.json()).toEqual(UNAUTHORIZED);
	});

	it("授業が終わっていれば410を返し、飛ばさない", async () => {
		const { token, studentId } = await seedStudent(endedLessonId);

		const res = await skip(token, 4);

		expect(res.status).toBe(410);
		expect(await res.json()).toEqual(LESSON_ENDED);
		const status = await studentRepository(db).findStatus(studentId);
		expect(status.clearedCount).toBe(0);
	});
});
