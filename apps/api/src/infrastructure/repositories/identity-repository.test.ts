import { beforeEach, describe, expect, it } from "bun:test";

import { sql } from "drizzle-orm";

// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "../database/drizzle";
import { attempts, lessons, mazes, students, teachers } from "../database/schema";
import { identityRepository } from "./identity-repository";

const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("RETURNINGで行が返されませんでした");
	return row;
};

const insertTeacher = async (tokenHash: string) =>
	only(await db.insert(teachers).values({ tokenHash }).returning());

const insertLesson = async (teacherId: string) =>
	only(await db.insert(lessons).values({ teacherId, endsAt: ENDS_AT }).returning());

const insertStudent = async (lessonId: string, tokenHash: string) =>
	only(await db.insert(students).values({ lessonId, name: "たろう", tokenHash }).returning());

describe("identityRepository", () => {
	beforeEach(async () => {
		await db.execute(
			sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`,
		);
	});

	describe("findTeacherByTokenHash", () => {
		it("tokenHashが一致する教師のIDを返す", async () => {
			const teacher = await insertTeacher("teacher-hash");
			await insertTeacher("other-teacher-hash");

			const found = await identityRepository(db).findTeacherByTokenHash("teacher-hash");

			expect(found).toEqual({ teacherId: teacher.id });
		});

		it("一致する教師がいなければnullを返す", async () => {
			await insertTeacher("teacher-hash");

			const found = await identityRepository(db).findTeacherByTokenHash("unknown-hash");

			expect(found).toBeNull();
		});

		it("児童のtokenHashでは当たらない", async () => {
			const teacher = await insertTeacher("teacher-hash");
			const lesson = await insertLesson(teacher.id);
			await insertStudent(lesson.id, "student-hash");

			const found = await identityRepository(db).findTeacherByTokenHash("student-hash");

			expect(found).toBeNull();
		});
	});

	describe("findStudentByTokenHash", () => {
		it("tokenHashが一致する児童のIDと、その授業のIDと終わる時刻を返す", async () => {
			const teacher = await insertTeacher("teacher-hash");
			const lesson = await insertLesson(teacher.id);
			const student = await insertStudent(lesson.id, "student-hash");
			await insertStudent(lesson.id, "other-student-hash");

			const found = await identityRepository(db).findStudentByTokenHash("student-hash");

			expect(found).toEqual({
				studentId: student.id,
				lessonId: lesson.id,
				lessonEndsAt: ENDS_AT,
			});
		});

		it("同じ名前の児童が別の授業にいても、tokenHashが一致する児童の授業を返す", async () => {
			const teacher = await insertTeacher("teacher-hash");
			const firstLesson = await insertLesson(teacher.id);
			const secondLesson = await insertLesson(teacher.id);
			await insertStudent(firstLesson.id, "first-student-hash");
			const second = await insertStudent(secondLesson.id, "second-student-hash");

			const found = await identityRepository(db).findStudentByTokenHash("second-student-hash");

			expect(found).toEqual({
				studentId: second.id,
				lessonId: secondLesson.id,
				lessonEndsAt: ENDS_AT,
			});
		});

		it("一致する児童がいなければnullを返す", async () => {
			const teacher = await insertTeacher("teacher-hash");
			const lesson = await insertLesson(teacher.id);
			await insertStudent(lesson.id, "student-hash");

			const found = await identityRepository(db).findStudentByTokenHash("unknown-hash");

			expect(found).toBeNull();
		});

		it("教師のtokenHashでは当たらない", async () => {
			const teacher = await insertTeacher("teacher-hash");
			const lesson = await insertLesson(teacher.id);
			await insertStudent(lesson.id, "student-hash");

			const found = await identityRepository(db).findStudentByTokenHash("teacher-hash");

			expect(found).toBeNull();
		});
	});
});
