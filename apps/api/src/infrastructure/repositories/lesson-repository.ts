import { and, count, desc, eq, gt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import { lessons, students } from "../database/schema";

const lessonColumns = {
	lessonId: lessons.id,
	createdAt: lessons.createdAt,
	endsAt: lessons.endsAt,
};

export const lessonRepository = (db: NodePgDatabase): LessonRepository => ({
	async create(lesson) {
		const [created] = await db.insert(lessons).values(lesson).returning({ lessonId: lessons.id });
		if (!created) throw new Error("授業の行が返されませんでした");

		return created.lessonId;
	},

	// 授業と児童の数を1回のクエリで求める
	async findOpenByTeacher(teacherId, now) {
		return db
			.select({
				lessonId: lessons.id,
				createdAt: lessons.createdAt,
				studentCount: count(students.id),
			})
			.from(lessons)
			.leftJoin(students, eq(students.lessonId, lessons.id))
			.where(and(eq(lessons.teacherId, teacherId), gt(lessons.endsAt, now)))
			.groupBy(lessons.id)
			.orderBy(desc(lessons.createdAt));
	},

	async findByIdAndTeacher(lessonId, teacherId) {
		const [lesson] = await db
			.select(lessonColumns)
			.from(lessons)
			.where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)));

		return lesson ?? null;
	},

	async findById(lessonId) {
		const [lesson] = await db.select(lessonColumns).from(lessons).where(eq(lessons.id, lessonId));

		return lesson ?? null;
	},

	async updateEndsAt(lessonId, teacherId, endsAt) {
		await db
			.update(lessons)
			.set({ endsAt })
			.where(and(eq(lessons.id, lessonId), eq(lessons.teacherId, teacherId)));
	},
});
