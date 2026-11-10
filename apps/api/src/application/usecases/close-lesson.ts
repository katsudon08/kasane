import { isLessonEnded } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";

type CloseLessonDeps = {
	lessonRepository: LessonRepository;
};

type CloseLessonResult = { ok: true } | Failure<"notFound" | "lessonEnded">;

// 授業を終える。終わる時刻を今の時刻で上書きする
export const closeLessonUseCase =
	({ lessonRepository }: CloseLessonDeps) =>
	async ({
		teacherId,
		lessonId,
		now,
	}: {
		teacherId: string;
		lessonId: string;
		now: Date;
	}): Promise<CloseLessonResult> => {
		const lesson = await lessonRepository.findByIdAndTeacher(lessonId, teacherId);
		if (lesson === null) return { ok: false, reason: "notFound" };
		if (isLessonEnded(lesson, now)) return { ok: false, reason: "lessonEnded" };

		await lessonRepository.updateEndsAt(lessonId, teacherId, now);

		return { ok: true };
	};

export type CloseLesson = ReturnType<typeof closeLessonUseCase>;
