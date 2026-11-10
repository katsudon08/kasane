/*
 * 教師用のHTTPのAPIのコントラクトテスト（仕様書backend.mdの「HTTPのAPI」「エラーの応答」「アクセス制御」）
 * `app.handle()`で呼び、応答が各ルートの応答スキーマに合うことと、表のとおりの状態コードになることを確かめる
 */
import { beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import { LESSON_DURATION_MS } from "@kasane/core";
import { eq, sql } from "drizzle-orm";
import { getSchemaValidator } from "elysia";
import type { TSchema } from "elysia";

import { createApp } from "./app";
import { generateToken, hashToken } from "./domain/services/token";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "./infrastructure/database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "./infrastructure/database/schema";
import { lessonBody, lessonIdBody, openLessonsBody, tokenBody } from "./presentation/schemas";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(30_000);

const app = createApp({ db });

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const UNAUTHORIZED = { code: "unauthorized" };
const NOT_FOUND = { code: "notFound" };
const LESSON_ENDED = { code: "lessonEnded" };
const INVALID_INPUT = { code: "invalidInput" };

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
const seedLesson = async (teacherId: string, createdAt: Date = new Date()) =>
	only(
		await db
			.insert(lessons)
			.values({ teacherId, createdAt, endsAt: hoursFromNow(1) })
			.returning(),
	);

// 終わっている授業（1時間前に終わった）を作る
const seedEndedLesson = async (teacherId: string) =>
	only(
		await db
			.insert(lessons)
			.values({ teacherId, createdAt: hoursFromNow(-6), endsAt: hoursFromNow(-1) })
			.returning(),
	);

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

const findLesson = async (lessonId: string) =>
	only(await db.select().from(lessons).where(eq(lessons.id, lessonId)));

// トークンが要る教師用のルート。パスの授業のIDは存在しないものでよい（本人の特定が先に失敗する）
const TEACHER_ROUTES = [
	{ method: "POST", path: "/lessons" },
	{ method: "GET", path: "/lessons" },
	{ method: "GET", path: `/lessons/${crypto.randomUUID()}` },
	{ method: "POST", path: `/lessons/${crypto.randomUUID()}/close` },
];

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);
});

describe("POST /teachers", () => {
	it("トークンなしで呼べて、201でトークンを返す", async () => {
		const res = await call("POST", "/teachers");
		const body = await json<{ token: string }>(res);

		expect(res.status).toBe(201);
		expect(conforms(tokenBody, body)).toBe(true);
		expect(body.token).toMatch(TOKEN_PATTERN);
	});

	it("DBにはトークンのSHA-256だけを保存する", async () => {
		const res = await call("POST", "/teachers");
		const { token } = await json<{ token: string }>(res);

		const hashed = await db
			.select()
			.from(teachers)
			.where(eq(teachers.tokenHash, hashToken(token)));
		const raw = await db.select().from(teachers).where(eq(teachers.tokenHash, token));

		expect(hashed).toHaveLength(1);
		expect(raw).toHaveLength(0);
	});

	it("発行したトークンで教師用のAPIを使える", async () => {
		const { token } = await json<{ token: string }>(await call("POST", "/teachers"));

		const res = await call("GET", "/lessons", { token });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	it("呼ぶたびに別の教師として、別のトークンを返す", async () => {
		const first = await json<{ token: string }>(await call("POST", "/teachers"));
		const second = await json<{ token: string }>(await call("POST", "/teachers"));

		expect(first.token).not.toBe(second.token);
	});
});

describe("トークンが要る教師用のルート", () => {
	it.each(TEACHER_ROUTES)(
		"$method $path: トークンがなければ401とWWW-Authenticate: Bearerを返す",
		async ({ method, path }) => {
			const res = await call(method, path);

			expect(res.status).toBe(401);
			expect(res.headers.get("www-authenticate")).toBe("Bearer");
			expect(await res.json()).toEqual(UNAUTHORIZED);
		},
	);

	it.each(TEACHER_ROUTES)(
		"$method $path: 児童のトークンでは401を返す",
		async ({ method, path }) => {
			const { teacherId } = await seedTeacher();
			const lesson = await seedLesson(teacherId);
			const student = await seedStudent(lesson.id);

			const res = await call(method, path, { token: student.token });

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual(UNAUTHORIZED);
		},
	);
});

describe("POST /lessons", () => {
	it("201で授業のIDを返し、その教師の授業を作る", async () => {
		const { token, teacherId } = await seedTeacher();

		const res = await call("POST", "/lessons", { token });
		const body = await json<{ lessonId: string }>(res);

		expect(res.status).toBe(201);
		expect(conforms(lessonIdBody, body)).toBe(true);
		expect(body.lessonId).toMatch(UUID_PATTERN);
		expect(res.headers.get("cache-control")).toBe("no-store");

		const lesson = await findLesson(body.lessonId);
		expect(lesson.teacherId).toBe(teacherId);
	});

	it("授業が終わる時刻は、作成から5時間後にする", async () => {
		const { token } = await seedTeacher();
		const before = Date.now();

		const { lessonId } = await json<{ lessonId: string }>(
			await call("POST", "/lessons", { token }),
		);
		const after = Date.now();

		const lesson = await findLesson(lessonId);
		expect(lesson.createdAt.getTime()).toBeGreaterThanOrEqual(before);
		expect(lesson.createdAt.getTime()).toBeLessThanOrEqual(after);
		expect(lesson.endsAt.getTime() - lesson.createdAt.getTime()).toBe(LESSON_DURATION_MS);
	});
});

describe("GET /lessons", () => {
	it("自分の開いている授業だけを、新しい順に、児童の数を付けて返す", async () => {
		const [{ token, teacherId }, other] = await Promise.all([seedTeacher(), seedTeacher()]);
		const [older, newer, , othersLesson] = await Promise.all([
			seedLesson(teacherId, hoursFromNow(-2)),
			seedLesson(teacherId, hoursFromNow(-1)),
			seedEndedLesson(teacherId),
			seedLesson(other.teacherId),
		]);
		await Promise.all([
			seedStudent(older.id, "たろう"),
			seedStudent(older.id, "はなこ"),
			seedStudent(othersLesson.id, "じろう"),
		]);

		const res = await call("GET", "/lessons", { token });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(conforms(openLessonsBody, body)).toBe(true);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(body).toEqual([
			{ lessonId: newer.id, createdAt: newer.createdAt.toISOString(), studentCount: 0 },
			{ lessonId: older.id, createdAt: older.createdAt.toISOString(), studentCount: 2 },
		]);
	});

	it("開いている授業がなければ空の配列を返す", async () => {
		const { token, teacherId } = await seedTeacher();
		await seedEndedLesson(teacherId);

		const res = await call("GET", "/lessons", { token });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(conforms(openLessonsBody, body)).toBe(true);
		expect(body).toEqual([]);
	});
});

describe("GET /lessons/:lessonId", () => {
	it("自分の開いている授業なら、始めた時刻を返す", async () => {
		const { token, teacherId } = await seedTeacher();
		const lesson = await seedLesson(teacherId);

		const res = await call("GET", `/lessons/${lesson.id}`, { token });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(conforms(lessonBody, body)).toBe(true);
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(body).toEqual({ createdAt: lesson.createdAt.toISOString() });
	});

	it("他の教師の授業は404を返す", async () => {
		const { token } = await seedTeacher();
		const other = await seedTeacher();
		const othersLesson = await seedLesson(other.teacherId);

		const res = await call("GET", `/lessons/${othersLesson.id}`, { token });

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("他の教師の終わった授業も、410ではなく404を返す（存在するかどうかを漏らさない）", async () => {
		const { token } = await seedTeacher();
		const other = await seedTeacher();
		const othersLesson = await seedEndedLesson(other.teacherId);

		const res = await call("GET", `/lessons/${othersLesson.id}`, { token });

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("存在しない授業は404を返す", async () => {
		const { token } = await seedTeacher();

		const res = await call("GET", `/lessons/${crypto.randomUUID()}`, { token });

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("終わった授業は410を返す", async () => {
		const { token, teacherId } = await seedTeacher();
		const lesson = await seedEndedLesson(teacherId);

		const res = await call("GET", `/lessons/${lesson.id}`, { token });

		expect(res.status).toBe(410);
		expect(await res.json()).toEqual(LESSON_ENDED);
	});

	it("授業のIDがUUIDでなければ422を返す", async () => {
		const { token } = await seedTeacher();

		const res = await call("GET", "/lessons/not-a-uuid", { token });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
		expect(res.headers.get("cache-control")).toBe("no-store");
	});

	it("授業のIDにurn:uuid:が付いていれば422を返す", async () => {
		const { token, teacherId } = await seedTeacher();
		const lesson = await seedLesson(teacherId);

		const res = await call("GET", `/lessons/urn:uuid:${lesson.id}`, { token });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});
});

describe("POST /lessons/:lessonId/close", () => {
	it("204を本文なしで返し、授業が終わる時刻を今の時刻で上書きする", async () => {
		const { token, teacherId } = await seedTeacher();
		const lesson = await seedLesson(teacherId);
		const before = Date.now();

		const res = await call("POST", `/lessons/${lesson.id}/close`, { token });
		const after = Date.now();

		expect(res.status).toBe(204);
		expect(await res.text()).toBe("");
		expect(res.headers.get("cache-control")).toBe("no-store");

		const closed = await findLesson(lesson.id);
		expect(closed.endsAt.getTime()).toBeGreaterThanOrEqual(before);
		expect(closed.endsAt.getTime()).toBeLessThanOrEqual(after);
	});

	it("終えた授業は、教師にも児童にも410になり、一覧から消える", async () => {
		const { token, teacherId } = await seedTeacher();
		const lesson = await seedLesson(teacherId);
		const student = await seedStudent(lesson.id);

		await call("POST", `/lessons/${lesson.id}/close`, { token });

		const detail = await call("GET", `/lessons/${lesson.id}`, { token });
		const list = await call("GET", "/lessons", { token });
		const me = await call("GET", "/me", { token: student.token });

		expect(detail.status).toBe(410);
		expect(await list.json()).toEqual([]);
		expect(me.status).toBe(410);
		expect(await me.json()).toEqual(LESSON_ENDED);
	});

	it("他の教師の授業は404を返し、終わらせない", async () => {
		const { token } = await seedTeacher();
		const other = await seedTeacher();
		const othersLesson = await seedLesson(other.teacherId);

		const res = await call("POST", `/lessons/${othersLesson.id}/close`, { token });

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
		expect((await findLesson(othersLesson.id)).endsAt).toEqual(othersLesson.endsAt);
	});

	it("存在しない授業は404を返す", async () => {
		const { token } = await seedTeacher();

		const res = await call("POST", `/lessons/${crypto.randomUUID()}/close`, { token });

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual(NOT_FOUND);
	});

	it("すでに終わった授業は410を返し、終わる時刻を変えない", async () => {
		const { token, teacherId } = await seedTeacher();
		const lesson = await seedEndedLesson(teacherId);

		const res = await call("POST", `/lessons/${lesson.id}/close`, { token });

		expect(res.status).toBe(410);
		expect(await res.json()).toEqual(LESSON_ENDED);
		expect((await findLesson(lesson.id)).endsAt).toEqual(lesson.endsAt);
	});

	it("授業のIDがUUIDでなければ422を返す", async () => {
		const { token } = await seedTeacher();

		const res = await call("POST", "/lessons/not-a-uuid/close", { token });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual(INVALID_INPUT);
	});
});
