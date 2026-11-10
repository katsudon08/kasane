import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { StudentRepository } from "../../domain/repositories/student-repository";
import { students } from "../database/schema";

export const studentRepository = (db: NodePgDatabase): StudentRepository => ({
	async create(student) {
		await db.insert(students).values(student);
	},

	async findName(studentId) {
		const [student] = await db
			.select({ name: students.name })
			.from(students)
			.where(eq(students.id, studentId));
		if (!student) throw new Error("本人を特定した児童の行がありません");

		return student.name;
	},
});
