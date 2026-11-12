import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { TutorialSkipRepository } from "../../domain/repositories/tutorial-skip-repository";
import { students } from "../database/schema";

export const tutorialSkipRepository = (db: NodePgDatabase): TutorialSkipRepository => ({
	// 今の値と比べて大きいほうにする。何度送っても、手前を選んでも減らない
	async skipThrough(studentId, through) {
		await db
			.update(students)
			.set({ skippedCount: sql`greatest(${students.skippedCount}, ${through})` })
			.where(eq(students.id, studentId));
	},
});
