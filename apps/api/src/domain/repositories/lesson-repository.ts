import type { Lesson, OpenLesson } from "../entities/lesson";

export interface LessonRepository {
	// 授業を作り、授業のIDを返す
	create(lesson: { teacherId: string; createdAt: Date; endsAt: Date }): Promise<string>;
	// その教師の、nowの時点で開いている授業を新しい順に返す
	findOpenByTeacher(teacherId: string, now: Date): Promise<OpenLesson[]>;
	// その教師の授業を引く。他の教師の授業・存在しない授業はnull
	findByIdAndTeacher(lessonId: string, teacherId: string): Promise<Lesson | null>;
	// 参加のために、授業のIDだけで引く。存在しなければnull
	findById(lessonId: string): Promise<Lesson | null>;
	// その教師の授業が終わる時刻を上書きする
	updateEndsAt(lessonId: string, teacherId: string, endsAt: Date): Promise<void>;
}
