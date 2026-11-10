import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { StudentIdentity, TeacherIdentity } from "../../domain/entities/identity";
import type { IdentityRepository } from "../../domain/repositories/identity-repository";
import { lessons, students, teachers } from "../database/schema";

// どちらもtokenHashのユニークインデックスで引く1クエリ
export const identityRepository = (db: NodePgDatabase): IdentityRepository => ({
	async findTeacherByTokenHash(tokenHash: string): Promise<TeacherIdentity | null> {
		const [teacher] = await db
			.select({ teacherId: teachers.id })
			.from(teachers)
			.where(eq(teachers.tokenHash, tokenHash));

		return teacher ?? null;
	},

	async findStudentByTokenHash(tokenHash: string): Promise<StudentIdentity | null> {
		const [student] = await db
			.select({
				studentId: students.id,
				lessonId: students.lessonId,
				lessonEndsAt: lessons.endsAt,
			})
			.from(students)
			.innerJoin(lessons, eq(lessons.id, students.lessonId))
			.where(eq(students.tokenHash, tokenHash));

		return student ?? null;
	},
});
