/*
 * 1授業の児童の数の上限のコントラクトテスト
 * （仕様書backend.mdの「入力の上限」の「1授業の児童の数」・「エラーの応答」・「HTTPのAPI」のPOST /students）
 * その授業のstudentsの行が300以上なら403のlessonFullを返し、行を作らないことを確かめる
 */
import { beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import { count, eq, sql } from "drizzle-orm";
import { getSchemaValidator } from "elysia";
import type { TSchema } from "elysia";

import { createApp } from "./app";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "./infrastructure/database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "./infrastructure/database/schema";
import { lessonFullBody, tokenBody } from "./presentation/schemas";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(30_000);

const app = createApp({ db });

// 仕様書の上限（300人まで）
const LIMIT = 300;

const LESSON_FULL = { code: "lessonFull" };
const LESSON_ENDED = { code: "lessonEnded" };

// 授業QRを読み取った児童として、参加する
const join = (lessonId: string, name: string) =>
	app.handle(
		new Request("http://localhost/students", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ lessonId, name }),
		}),
	);

// 応答の本文が、ルートの応答スキーマに合うか
const conforms = (schema: TSchema, value: unknown): boolean =>
	getSchemaValidator(schema).Check(value);

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("行が返されませんでした");
	return row;
};

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

let teacherId: string;

// 児童がstudentCount人いる授業を作る。endsAtを渡さなければ、開いている授業（1時間後に終わる）
const seedLessonWith = async (studentCount: number, endsAt: Date = hoursFromNow(1)) => {
	const lessonId = only(
		await db
			.insert(lessons)
			.values({ teacherId, createdAt: hoursFromNow(-6), endsAt })
			.returning(),
	).id;
	if (studentCount > 0) {
		await db.insert(students).values(
			Array.from({ length: studentCount }, () => ({
				lessonId,
				name: "たろう",
				tokenHash: crypto.randomUUID(),
			})),
		);
	}
	return lessonId;
};

const countStudents = async (lessonId: string) =>
	only(await db.select({ value: count() }).from(students).where(eq(students.lessonId, lessonId)))
		.value;

const studentsNamed = (name: string) => db.select().from(students).where(eq(students.name, name));

let fullLessonId: string;

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);

	teacherId = only(await db.insert(teachers).values({ tokenHash: "teacher-hash" }).returning()).id;
	fullLessonId = await seedLessonWith(LIMIT);
});

describe("POST /students（児童の数の上限）", () => {
	it("児童が299人の授業には、201で参加できる（300人になる）", async () => {
		const lessonId = await seedLessonWith(LIMIT - 1);

		const res = await join(lessonId, "さいごのひとり");

		expect(res.status).toBe(201);
		expect(conforms(tokenBody, await res.json())).toBe(true);
		expect(await countStudents(lessonId)).toBe(LIMIT);
	});

	it("児童が300人の授業には、403でlessonFullを返し、児童を作らない", async () => {
		const res = await join(fullLessonId, "はいれない");
		const body: unknown = await res.json();

		expect(res.status).toBe(403);
		expect(body).toEqual(LESSON_FULL);
		expect(conforms(lessonFullBody, body)).toBe(true);
		expect(await countStudents(fullLessonId)).toBe(LIMIT);
		expect(await studentsNamed("はいれない")).toEqual([]);
	});

	it("他の授業が300人でも、自分の授業には参加できる", async () => {
		const lessonId = await seedLessonWith(0);

		const res = await join(lessonId, "べつのじゅぎょう");

		expect(res.status).toBe(201);
		expect(await countStudents(lessonId)).toBe(1);
	});

	it("終わっている授業は、300人いても410でlessonEndedを返す（授業の終わりを先に確かめる）", async () => {
		const endedLessonId = await seedLessonWith(LIMIT, hoursFromNow(-1));

		const res = await join(endedLessonId, "おわったあと");

		expect(res.status).toBe(410);
		expect(await res.json()).toEqual(LESSON_ENDED);
		expect(await studentsNamed("おわったあと")).toEqual([]);
	});
});
