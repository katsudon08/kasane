/*
 * テーブルの制約（仕様書backend.mdの「データモデル」）
 * テスト用DBには、テストの前にマイグレーションが当たっている（migrate-test-database.ts）
 */
import { beforeEach, describe, expect, it } from "bun:test";

import type { Maze, Program } from "@kasane/core";
import { eq, sql } from "drizzle-orm";

// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "./drizzle";
import { attempts, lessons, mazes, students, teachers } from "./schema";

// PostgreSQLのエラーコード
const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

// バージョンの指定はしない
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

const PROGRAM: Program = [{ type: "forward" }];

const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");

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

const insertTeacher = async (tokenHash = "teacher-hash") =>
	only(await db.insert(teachers).values({ tokenHash }).returning());

const insertLesson = async () => {
	const teacher = await insertTeacher();
	return only(
		await db.insert(lessons).values({ teacherId: teacher.id, endsAt: ENDS_AT }).returning(),
	);
};

const insertStudent = async () => {
	const lesson = await insertLesson();
	return only(
		await db
			.insert(students)
			.values({ lessonId: lesson.id, name: "たろう", tokenHash: "student-hash" })
			.returning(),
	);
};

const insertMaze = async (studentId: string) =>
	only(await db.insert(mazes).values({ studentId, name: "めいろ", data: MAZE }).returning());

describe("テーブル定義", () => {
	beforeEach(async () => {
		await db.execute(
			sql`truncate table ${attempts}, ${mazes}, ${students}, ${lessons}, ${teachers}`,
		);
	});

	describe("テーブル", () => {
		it("5テーブルだけがあり、roomsはない", async () => {
			const result = await db.execute<{ table_name: string }>(
				sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
			);

			expect(result.rows.map((row) => row.table_name)).toEqual([
				"attempts",
				"lessons",
				"mazes",
				"students",
				"teachers",
			]);
		});

		it("idはDBが乱数で採番し、createdAtはDBが入れる", async () => {
			const first = await insertTeacher("first-hash");
			const second = await insertTeacher("second-hash");

			expect(first.id).toMatch(UUID_PATTERN);
			expect(first.id).not.toBe(second.id);
			expect(first.createdAt).toBeInstanceOf(Date);
		});

		it("迷路と挑戦の記録は、入れたdataとprogramをそのまま読める", async () => {
			const student = await insertStudent();
			const maze = await insertMaze(student.id);
			const attempt = only(
				await db
					.insert(attempts)
					.values({ studentId: student.id, mazeId: maze.id, program: PROGRAM, succeeded: true })
					.returning(),
			);

			expect(maze.data).toEqual(MAZE);
			expect(maze.updatedAt).toBeInstanceOf(Date);
			expect(attempt.program).toEqual(PROGRAM);
			expect(attempt.succeeded).toBe(true);
		});
	});

	describe("tokenHashのユニーク制約", () => {
		it("同じtokenHashの教師は作れない", async () => {
			await insertTeacher("same-hash");

			const code = await errorCodeOf(db.insert(teachers).values({ tokenHash: "same-hash" }));

			expect(code).toBe(UNIQUE_VIOLATION);
		});

		it("同じtokenHashの児童は作れない", async () => {
			const student = await insertStudent();

			const code = await errorCodeOf(
				db
					.insert(students)
					.values({ lessonId: student.lessonId, name: "はなこ", tokenHash: student.tokenHash }),
			);

			expect(code).toBe(UNIQUE_VIOLATION);
		});

		it("同じ授業に同じ名前の児童を作れる（名前にユニーク制約がない）", async () => {
			const student = await insertStudent();

			const code = await errorCodeOf(
				db
					.insert(students)
					.values({ lessonId: student.lessonId, name: student.name, tokenHash: "other-hash" }),
			);

			expect(code).toBeNull();
		});
	});

	describe("外部キー", () => {
		it("存在しない教師の授業は作れない", async () => {
			const code = await errorCodeOf(
				db.insert(lessons).values({ teacherId: crypto.randomUUID(), endsAt: ENDS_AT }),
			);

			expect(code).toBe(FOREIGN_KEY_VIOLATION);
		});

		it("存在しない授業の児童は作れない", async () => {
			const code = await errorCodeOf(
				db
					.insert(students)
					.values({ lessonId: crypto.randomUUID(), name: "たろう", tokenHash: "student-hash" }),
			);

			expect(code).toBe(FOREIGN_KEY_VIOLATION);
		});

		it("存在しない児童の迷路は作れない", async () => {
			const code = await errorCodeOf(
				db.insert(mazes).values({ studentId: crypto.randomUUID(), name: "めいろ", data: MAZE }),
			);

			expect(code).toBe(FOREIGN_KEY_VIOLATION);
		});

		it("存在しない児童の挑戦の記録は作れない", async () => {
			const code = await errorCodeOf(
				db.insert(attempts).values({
					studentId: crypto.randomUUID(),
					tutorialNo: 1,
					program: PROGRAM,
					succeeded: false,
				}),
			);

			expect(code).toBe(FOREIGN_KEY_VIOLATION);
		});

		it("存在しない迷路への挑戦の記録は作れない", async () => {
			const student = await insertStudent();

			const code = await errorCodeOf(
				db.insert(attempts).values({
					studentId: student.id,
					mazeId: crypto.randomUUID(),
					program: PROGRAM,
					succeeded: false,
				}),
			);

			expect(code).toBe(FOREIGN_KEY_VIOLATION);
		});
	});

	describe("attemptsのcheck制約（tutorialNoとmazeIdのちょうど一方だけが入る）", () => {
		it("tutorialNoだけなら入る", async () => {
			const student = await insertStudent();

			const code = await errorCodeOf(
				db
					.insert(attempts)
					.values({ studentId: student.id, tutorialNo: 1, program: PROGRAM, succeeded: true }),
			);

			expect(code).toBeNull();
		});

		it("mazeIdだけなら入る", async () => {
			const student = await insertStudent();
			const maze = await insertMaze(student.id);

			const code = await errorCodeOf(
				db
					.insert(attempts)
					.values({ studentId: student.id, mazeId: maze.id, program: PROGRAM, succeeded: true }),
			);

			expect(code).toBeNull();
		});

		it("どちらもなければ入らない", async () => {
			const student = await insertStudent();

			const code = await errorCodeOf(
				db.insert(attempts).values({ studentId: student.id, program: PROGRAM, succeeded: true }),
			);

			expect(code).toBe(CHECK_VIOLATION);
		});

		it("両方あれば入らない", async () => {
			const student = await insertStudent();
			const maze = await insertMaze(student.id);

			const code = await errorCodeOf(
				db.insert(attempts).values({
					studentId: student.id,
					tutorialNo: 1,
					mazeId: maze.id,
					program: PROGRAM,
					succeeded: true,
				}),
			);

			expect(code).toBe(CHECK_VIOLATION);
		});
	});

	describe("迷路を消したとき", () => {
		it("その迷路への挑戦の記録も消え、ほかの記録は残る", async () => {
			const student = await insertStudent();
			const deleted = await insertMaze(student.id);
			const kept = await insertMaze(student.id);
			await db.insert(attempts).values([
				{ studentId: student.id, mazeId: deleted.id, program: PROGRAM, succeeded: true },
				{ studentId: student.id, mazeId: kept.id, program: PROGRAM, succeeded: false },
				{ studentId: student.id, tutorialNo: 1, program: PROGRAM, succeeded: true },
			]);

			await db.delete(mazes).where(eq(mazes.id, deleted.id));

			const rows = await db
				.select({ mazeId: attempts.mazeId, tutorialNo: attempts.tutorialNo })
				.from(attempts);
			expect(rows).toHaveLength(2);
			expect(rows).toContainEqual({ mazeId: kept.id, tutorialNo: null });
			expect(rows).toContainEqual({ mazeId: null, tutorialNo: 1 });
		});
	});

	describe("インデックス", () => {
		it.each([
			{ table: "lessons", columns: "(teacher_id, created_at)" },
			{ table: "students", columns: "(lesson_id, created_at)" },
			{ table: "mazes", columns: "(student_id)" },
			{ table: "attempts", columns: "(student_id, created_at)" },
		])("$table: $columns のインデックスがある", async ({ table, columns }) => {
			const result = await db.execute<{ indexdef: string }>(
				sql`select indexdef from pg_indexes where schemaname = 'public' and tablename = ${table}`,
			);

			const definitions = result.rows.map((row) => row.indexdef);
			expect(definitions.some((definition) => definition.endsWith(`USING btree ${columns}`))).toBe(
				true,
			);
		});
	});
});
