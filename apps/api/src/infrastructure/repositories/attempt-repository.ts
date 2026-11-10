import { and, countDistinct, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import { attempts } from "../database/schema";

export const attemptRepository = (db: NodePgDatabase): AttemptRepository => ({
	async create({ studentId, target, program, succeeded }) {
		await db.insert(attempts).values({ studentId, ...target, program, succeeded });
	},

	// 自分の迷路への記録はtutorialNoがnullなので、種類の数には入らない
	async countClearedTutorials(studentId) {
		const [row] = await db
			.select({ clearedCount: countDistinct(attempts.tutorialNo) })
			.from(attempts)
			.where(and(eq(attempts.studentId, studentId), eq(attempts.succeeded, true)));

		return row?.clearedCount ?? 0;
	},
});
