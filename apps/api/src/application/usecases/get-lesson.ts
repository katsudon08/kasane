import { isLessonEnded } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { Lesson } from "../../domain/entities/lesson";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";

type GetLessonDeps = {
	lessonRepository: LessonRepository;
};

type GetLessonResult = { ok: true; lesson: Lesson } | Failure<"notFound" | "lessonEnded">;

// その教師の開いている授業を返す。他の教師の授業は、終わっていても存在しない扱いにする
export const getLessonUseCase =
	({ lessonRepository }: GetLessonDeps) =>
	async ({
		teacherId,
		lessonId,
		now,
	}: {
		teacherId: string;
		lessonId: string;
		now: Date;
	}): Promise<GetLessonResult> => {
		const lesson = await lessonRepository.findByIdAndTeacher(lessonId, teacherId);
		if (lesson === null) return { ok: false, reason: "notFound" };
		if (isLessonEnded(lesson, now)) return { ok: false, reason: "lessonEnded" };

		return { ok: true, lesson };
	};

export type GetLesson = ReturnType<typeof getLessonUseCase>;
