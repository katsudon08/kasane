/*
 * 名前の長さの制約（仕様書backend.mdの「データモデル」のstudents.name・mazes.nameの「1〜20文字」）
 * APIはTypeBoxで1〜20文字に限っているが、DBでも同じ範囲の外の名前を入れられないようにする
 * テスト用DBには、テストの前にマイグレーションが当たっている（migrate-test-database.ts）
 */
import { beforeEach, describe, expect, it } from "bun:test";

import type { Maze } from "@kasane/core";
import { sql } from "drizzle-orm";

import { db } from "./drizzle";
import { attempts, lessons, mazes, students, teachers } from "./schema";

const CHECK_VIOLATION = "23514";

const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");

const MAZE: Maze = {
	layers: [
		[
			["start", "floor", "floor", "floor", "goal"],
			["floor", "floor", "floor", "floor", "floor"],
			["floor", "floor", "floor", "floor", "floor"],
			["floor", "floor", "floor", "floor", "floor"],
			["floor", "floor", "floor", "floor", "floor"],
		],
	],
	startDirection: "east",
};

// 失敗したクエリのPostgreSQLのエラーコードを返す。成功したらnull
const errorCodeOf = async (query: PromiseLike<unknown>): Promise<string | null> => {
	try {
		await query;
		return null;
	} catch (error) {
		// Drizzleはpgのエラーをcauseに入れて投げ直す
		const cause = error instanceof Error ? error.cause : undefined;
		if (
			typeof cause === "object" &&
			cause !== null &&
			"code" in cause &&
			typeof cause.code === "string"
		) {
			return cause.code;
		}
		throw error;
	}
};

const only = <Row>(rows: Row[]): Row => {
	const [row] = rows;
	if (!row) throw new Error("RETURNINGで行が返されませんでした");
	return row;
};

const insertLesson = async () => {
	const teacher = only(await db.insert(teachers).values({ tokenHash: "teacher-hash" }).returning());
	return only(
		await db.insert(lessons).values({ teacherId: teacher.id, endsAt: ENDS_AT }).returning(),
	);
};

const insertStudent = async (name: string, tokenHash = "student-hash") => {
	const lesson = await insertLesson();
	return db.insert(students).values({ lessonId: lesson.id, name, tokenHash }).returning();
};

describe("名前の長さの制約", () => {
	beforeEach(async () => {
		await db.execute(
			sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`,
		);
	});

	describe("students.name", () => {
		it.each([
			{ name: "あ", length: 1 },
			{ name: "あ".repeat(20), length: 20 },
		])("$length文字なら入る", async ({ name }) => {
			expect(await errorCodeOf(insertStudent(name))).toBeNull();
		});

		it.each([
			{ name: "", length: 0 },
			{ name: "あ".repeat(21), length: 21 },
		])("$length文字なら入らない", async ({ name }) => {
			expect(await errorCodeOf(insertStudent(name))).toBe(CHECK_VIOLATION);
		});
	});

	describe("mazes.name", () => {
		const insertMaze = async (name: string) => {
			const student = only(await insertStudent("たろう"));
			return db.insert(mazes).values({ studentId: student.id, name, data: MAZE }).returning();
		};

		it.each([
			{ name: "め", length: 1 },
			{ name: "め".repeat(20), length: 20 },
		])("$length文字なら入る", async ({ name }) => {
			expect(await errorCodeOf(insertMaze(name))).toBeNull();
		});

		it.each([
			{ name: "", length: 0 },
			{ name: "め".repeat(21), length: 21 },
		])("$length文字なら入らない", async ({ name }) => {
			expect(await errorCodeOf(insertMaze(name))).toBe(CHECK_VIOLATION);
		});
	});
});
