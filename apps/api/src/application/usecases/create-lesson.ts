import { lessonEndsAt } from "@kasane/core";

import type { LessonRepository } from "../../domain/repositories/lesson-repository";

type CreateLessonDeps = {
	lessonRepository: LessonRepository;
};

// 授業を作る。終わる時刻は作成から5時間後
export const createLessonUseCase =
	({ lessonRepository }: CreateLessonDeps) =>
	async ({ teacherId, now }: { teacherId: string; now: Date }): Promise<{ lessonId: string }> => {
		const lessonId = await lessonRepository.create({
			teacherId,
			createdAt: now,
			endsAt: lessonEndsAt(now),
		});

		return { lessonId };
	};

export type CreateLesson = ReturnType<typeof createLessonUseCase>;
