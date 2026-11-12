import { TUTORIALS } from "@kasane/core";
import { and, asc, count, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { LastResult, StudentStatus } from "../../domain/entities/student-status";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { isLessonFull } from "../../domain/services/lesson-capacity";
import { attempts, lessons, students } from "../database/schema";
import { clearedCountOf } from "./attempt-repository";

const toLastResult = (succeeded: boolean | null): LastResult => {
	if (succeeded === null) return "notSent";
	return succeeded ? "succeeded" : "failed";
};

/*
 * 教師に見せる状態（仕様書backend.mdの「教師に見せる状態の求め方」）を、1回のクエリで求める
 * - クリア数: 飛ばした問題の数に、それより後で成功した記録にあるチュートリアルの種類の数を足したもの（自分の迷路への記録はtutorialNoがnullなので入らない）
 * - 今の問題: クリア数がチュートリアルの数より少なければチュートリアル（クリア数＋1）、全部クリアしていれば最後に送った自分の迷路
 * - 今の問題の結果: 今の問題で最後に送った記録のsucceeded。一度も送っていなければnull
 * 全部クリアした後は、自分の迷路への最後の記録が「最後に送った迷路で最後に送った記録」になる
 */
const findStatuses = async (
	db: NodePgDatabase,
	condition: SQL | undefined,
): Promise<StudentStatus[]> => {
	// 児童ごとのクリア数。列の名前は、後で結合するattemptsの列と重ならないようにする
	const progress = db.$with("progress").as(
		db
			.select({
				studentId: sql<string>`${students.id}`.as("progress_student_id"),
				name: sql<string>`${students.name}`.as("progress_name"),
				joinedAt: sql<Date>`${students.createdAt}`.as("progress_joined_at"),
				clearedCount: clearedCountOf.as("progress_cleared_count"),
			})
			.from(students)
			.innerJoin(lessons, eq(lessons.id, students.lessonId))
			.leftJoin(attempts, eq(attempts.studentId, students.id))
			.where(condition)
			.groupBy(students.id),
	);

	// 今の問題への記録
	const isCurrentProblem = sql`case
		when ${progress.clearedCount} < ${TUTORIALS.length}
			then ${attempts.tutorialNo} = ${progress.clearedCount} + 1
		else ${attempts.mazeId} is not null
	end`;

	const rows = await db
		.with(progress)
		.select({
			studentId: progress.studentId,
			name: progress.name,
			clearedCount: progress.clearedCount,
			// 今の問題で最後に送った記録。記録がなければnull
			lastSucceeded: sql<
				boolean | null
			>`(array_agg(${attempts.succeeded} order by ${attempts.createdAt} desc))[1]`,
		})
		.from(progress)
		.leftJoin(attempts, and(eq(attempts.studentId, progress.studentId), isCurrentProblem))
		.groupBy(progress.studentId, progress.name, progress.joinedAt, progress.clearedCount)
		// 並びを決定的にする（参加した順、同じならID順）
		.orderBy(asc(progress.joinedAt), asc(progress.studentId));

	return rows.map(({ studentId, name, clearedCount, lastSucceeded }) => ({
		studentId,
		name,
		clearedCount,
		lastResult: toLastResult(lastSucceeded),
	}));
};

export const studentRepository = (db: NodePgDatabase): StudentRepository => ({
	async create(student) {
		/*
		 * 数えてから行を入れるまでに参加が重なると、上限を数人超えることがある
		 * 際限なく増やさないことが目的なので、厳密には数えない（仕様書backend.mdの「入力の上限」）
		 */
		const [existing] = await db
			.select({ studentCount: count() })
			.from(students)
			.where(eq(students.lessonId, student.lessonId));
		if (!existing) throw new Error("児童の数が返されませんでした");
		if (isLessonFull(existing.studentCount)) return null;

		const [created] = await db
			.insert(students)
			.values(student)
			.returning({ studentId: students.id });
		if (!created) throw new Error("児童の行が返されませんでした");

		return created.studentId;
	},

	async findName(studentId) {
		const [student] = await db
			.select({ name: students.name })
			.from(students)
			.where(eq(students.id, studentId));
		if (!student) throw new Error("本人を特定した児童の行がありません");

		return student.name;
	},

	async findStatus(studentId) {
		const [status] = await findStatuses(db, eq(students.id, studentId));
		if (!status) throw new Error("本人を特定した児童の行がありません");

		return status;
	},

	// 授業のIDだけでなく、本人（教師）のIDも条件に入れる
	async findStatusesByLesson(lessonId, teacherId) {
		return findStatuses(db, and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)));
	},
});
