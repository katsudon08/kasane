import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { TeacherRepository } from "../../domain/repositories/teacher-repository";
import { teachers } from "../database/schema";

export const teacherRepository = (db: NodePgDatabase): TeacherRepository => ({
	async create(tokenHash) {
		await db.insert(teachers).values({ tokenHash });
	},
});
