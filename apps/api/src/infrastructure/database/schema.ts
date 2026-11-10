/*
 * テーブル定義（仕様書backend.mdの「データモデル」）
 * DBの列名はsnake_caseにする
 */
import type { Maze, Program } from "@kasane/core";
import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const teachers = pgTable("teachers", {
	id: uuid().defaultRandom().primaryKey(),
	// 教師のトークンのSHA-256
	tokenHash: text("token_hash").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessons = pgTable(
	"lessons",
	{
		id: uuid().defaultRandom().primaryKey(),
		teacherId: uuid("teacher_id")
			.notNull()
			.references(() => teachers.id),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		// 授業が終わる時刻。作成時は作成から5時間後、「授業を終える」でその時刻に上書きする
		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("lessons_teacher_id_created_at_idx").on(table.teacherId, table.createdAt)],
);

export const students = pgTable(
	"students",
	{
		id: uuid().defaultRandom().primaryKey(),
		// 児童のトークンから授業を引くために、トークンのハッシュと同じ行に持つ
		lessonId: uuid("lesson_id")
			.notNull()
			.references(() => lessons.id),
		// 同じ授業に同じ名前の児童がいてもよい（名前にユニーク制約を付けない）
		name: text().notNull(),
		// 児童のトークンのSHA-256
		tokenHash: text("token_hash").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("students_lesson_id_created_at_idx").on(table.lessonId, table.createdAt)],
);

export const mazes = pgTable(
	"mazes",
	{
		id: uuid().defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id),
		name: text().notNull(),
		data: jsonb().$type<Maze>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("mazes_student_id_idx").on(table.studentId)],
);

// 1回の挑戦（プログラムを1回送った記録）。追加だけで更新しない
export const attempts = pgTable(
	"attempts",
	{
		id: uuid().defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id),
		// 1から始まる番号
		tutorialNo: integer("tutorial_no"),
		// 迷路を消すと、その迷路への記録も消す
		mazeId: uuid("maze_id").references(() => mazes.id, { onDelete: "cascade" }),
		program: jsonb().$type<Program>().notNull(),
		// compileの結果がgoalだったか
		succeeded: boolean().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("attempts_student_id_created_at_idx").on(table.studentId, table.createdAt),
		// チュートリアルか自分の迷路の、ちょうど一方だけが入る
		check(
			"attempts_tutorial_no_xor_maze_id_check",
			sql`(${table.tutorialNo} is null) <> (${table.mazeId} is null)`,
		),
	],
);
