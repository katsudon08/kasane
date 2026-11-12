import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import { attempts, students } from "../database/schema";

/*
 * クリア数（仕様書backend.mdの「教師に見せる状態の求め方」）。studentsとattemptsを結合して児童ごとにまとめた行で使う
 * 飛ばした問題の数に、それより後で成功した記録にあるチュートリアルの種類の数を足す
 */
export const clearedCountOf =
	sql<number>`${students.skippedCount} + count(distinct ${attempts.tutorialNo}) filter (where ${attempts.succeeded} and ${attempts.tutorialNo} > ${students.skippedCount})`.mapWith(
		Number,
	);

export const attemptRepository = (db: NodePgDatabase): AttemptRepository => ({
	async create({ studentId, target, program, succeeded }) {
		await db.insert(attempts).values({ studentId, ...target, program, succeeded });
	},

	/*
	 * 飛ばした問題の数に、それより後で成功した記録にあるチュートリアルの種類の数を足す
	 * 飛ばした問題を解いていても、二重に数えない。自分の迷路への記録はtutorialNoがnullなので、種類の数には入らない
	 */
	async countClearedTutorials(studentId) {
		const [row] = await db
			.select({ clearedCount: clearedCountOf })
			.from(students)
			.leftJoin(attempts, eq(attempts.studentId, students.id))
			.where(eq(students.id, studentId))
			.groupBy(students.id);

		return row?.clearedCount ?? 0;
	},
});
