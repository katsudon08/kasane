/*
 * 1授業の児童の数の上限（仕様書backend.mdの「入力の上限」の「1授業の児童の数」）
 * その授業のstudentsの行が300以上なら、児童の行を作らないことを確かめる
 */
import { beforeAll, describe, expect, it, setDefaultTimeout } from "bun:test";

import { count, eq, sql } from "drizzle-orm";

// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "../database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "../database/schema";
import { studentRepository } from "./student-repository";

// テスト用DBは遠くにあり、1回の往復に時間がかかるので、既定の5秒より長く待つ
setDefaultTimeout(30_000);

const repository = studentRepository(db);

// 仕様書の上限（300人まで）
const LIMIT = 300;

const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("行が返されませんでした");
	return row;
};

let teacherId: string;

// 児童がstudentCount人いる授業を作る
const insertLessonWith = async (studentCount: number) => {
	const lessonId = only(
		await db.insert(lessons).values({ teacherId, endsAt: ENDS_AT }).returning(),
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

beforeAll(async () => {
	await db.execute(sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`);

	teacherId = only(await db.insert(teachers).values({ tokenHash: "teacher-hash" }).returning()).id;
});

describe("studentRepository.create（児童の数の上限）", () => {
	it("児童が299人の授業には行を作り、児童のIDを返す（300人になる）", async () => {
		const lessonId = await insertLessonWith(LIMIT - 1);

		const studentId = await repository.create({
			lessonId,
			name: "はなこ",
			tokenHash: crypto.randomUUID(),
		});

		if (studentId === null) throw new Error("児童の行を作れませんでした");
		const [row] = await db.select().from(students).where(eq(students.id, studentId));
		expect(row).toMatchObject({ lessonId, name: "はなこ" });
		expect(await countStudents(lessonId)).toBe(LIMIT);
	});

	it("児童が300人の授業には行を作らず、nullを返す", async () => {
		const lessonId = await insertLessonWith(LIMIT);
		const tokenHash = crypto.randomUUID();

		const studentId = await repository.create({ lessonId, name: "はなこ", tokenHash });

		expect(studentId).toBeNull();
		expect(await countStudents(lessonId)).toBe(LIMIT);
		expect(await db.select().from(students).where(eq(students.tokenHash, tokenHash))).toEqual([]);
	});

	it("他の授業の児童は、数に入れない", async () => {
		await insertLessonWith(LIMIT);
		const lessonId = await insertLessonWith(0);

		const studentId = await repository.create({
			lessonId,
			name: "はなこ",
			tokenHash: crypto.randomUUID(),
		});

		expect(studentId).not.toBeNull();
		expect(await countStudents(lessonId)).toBe(1);
	});
});
