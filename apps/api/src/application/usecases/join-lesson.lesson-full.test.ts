/*
 * 児童の数が上限に達した授業に参加する（仕様書backend.mdの「HTTPのAPI」のPOST /studentsと、「入力の上限」の「1授業の児童の数」）
 * 行を作らず、教師へ知らせもせずにlessonFullを返すことと、授業の終わりを先に確かめることを確かめる
 */
import { describe, expect, it, mock } from "bun:test";

import type { Lesson } from "../../domain/entities/lesson";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { joinLessonUseCase } from "./join-lesson";

const NOW = new Date("2026-11-10T02:00:00.000Z");

const LESSON: Lesson = {
	lessonId: "0b0f3a52-6c1d-4a59-9f5e-2f1f3c7d8e9a",
	createdAt: new Date("2026-11-10T00:00:00.000Z"),
	endsAt: new Date("2026-11-10T05:00:00.000Z"),
};
const ENDED_LESSON: Lesson = { ...LESSON, endsAt: NOW };

// 児童の数が上限に達している授業では、児童の行を作れない（nullが返る）
const setup = (lesson: Lesson) => {
	const create = mock(
		async (_student: { lessonId: string; name: string; tokenHash: string }) => null,
	);
	const notifyStudentStatus = mock(async (_target: { lessonId: string; studentId: string }) => {});
	const lessonRepository: LessonRepository = {
		create: async () => LESSON.lessonId,
		findOpenByTeacher: async () => [],
		findByIdAndTeacher: async () => lesson,
		findById: async () => lesson,
		updateEndsAt: async () => {},
	};
	const studentRepository: StudentRepository = {
		create,
		findName: async () => "たろう",
		findStatus: async () => ({
			studentId: "student-1",
			name: "たろう",
			clearedCount: 0,
			lastResult: "notSent",
		}),
		findStatusesByLesson: async () => [],
	};
	const joinLesson = joinLessonUseCase({
		lessonRepository,
		studentRepository,
		notifyStudentStatus,
	});

	return { joinLesson, create, notifyStudentStatus };
};

describe("joinLessonUseCase（児童の数の上限）", () => {
	it("児童の数が上限に達していれば、教師へ知らせずにlessonFullを返す", async () => {
		const { joinLesson, create, notifyStudentStatus } = setup(LESSON);

		const result = await joinLesson({ lessonId: LESSON.lessonId, name: "たろう", now: NOW });

		expect(result).toEqual({ ok: false, reason: "lessonFull" });
		expect(create).toHaveBeenCalledTimes(1);
		expect(notifyStudentStatus).not.toHaveBeenCalled();
	});

	it("授業が終わっていれば、上限に達していても行を作ろうとせずlessonEndedを返す", async () => {
		const { joinLesson, create, notifyStudentStatus } = setup(ENDED_LESSON);

		const result = await joinLesson({ lessonId: LESSON.lessonId, name: "たろう", now: NOW });

		expect(result).toEqual({ ok: false, reason: "lessonEnded" });
		expect(create).not.toHaveBeenCalled();
		expect(notifyStudentStatus).not.toHaveBeenCalled();
	});
});
