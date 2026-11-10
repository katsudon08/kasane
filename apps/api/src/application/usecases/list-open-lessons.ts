import type { OpenLesson } from "../../domain/entities/lesson";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";

type ListOpenLessonsDeps = {
	lessonRepository: LessonRepository;
};

// その教師の開いている授業を、新しい順に返す
export const listOpenLessonsUseCase =
	({ lessonRepository }: ListOpenLessonsDeps) =>
	async ({ teacherId, now }: { teacherId: string; now: Date }): Promise<OpenLesson[]> =>
		lessonRepository.findOpenByTeacher(teacherId, now);

export type ListOpenLessons = ReturnType<typeof listOpenLessonsUseCase>;
