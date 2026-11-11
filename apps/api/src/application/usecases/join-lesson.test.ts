/*
 * 授業に参加する（仕様書backend.mdの「HTTPのAPI」のPOST /studentsと、「サーバーからの知らせ（SSE）」）
 * 児童の行を入れた後に教師へ知らせることと、知らせの送り先をDBの授業のIDで引くことを確かめる
 */
import { describe, expect, it, mock } from "bun:test";

import type { Lesson } from "../../domain/entities/lesson";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { hashToken } from "../../domain/services/token";
import { joinLessonUseCase } from "./join-lesson";

const NOW = new Date("2026-11-10T02:00:00.000Z");

const LESSON: Lesson = {
	lessonId: "0b0f3a52-6c1d-4a59-9f5e-2f1f3c7d8e9a",
	createdAt: new Date("2026-11-10T00:00:00.000Z"),
	endsAt: new Date("2026-11-10T05:00:00.000Z"),
};
const ENDED_LESSON: Lesson = { ...LESSON, endsAt: NOW };

const STUDENT_ID = "student-1";

const setup = (lesson: Lesson | null) => {
	// 呼ばれた順番を残す
	const calls: string[] = [];
	const findById = mock(async (_lessonId: string) => lesson);
	const create = mock(async (_student: { lessonId: string; name: string; tokenHash: string }) => {
		calls.push("create");
		return STUDENT_ID;
	});
	const notifyStudentStatus = mock(async (_target: { lessonId: string; studentId: string }) => {
		calls.push("notify");
	});
	const lessonRepository: LessonRepository = {
		create: async () => LESSON.lessonId,
		findOpenByTeacher: async () => [],
		findByIdAndTeacher: async () => lesson,
		findById,
		updateEndsAt: async () => {},
	};
	const studentRepository: StudentRepository = {
		create,
		findName: async () => "たろう",
		findStatus: async () => ({
			studentId: STUDENT_ID,
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

	return { joinLesson, calls, findById, create, notifyStudentStatus };
};

describe("joinLessonUseCase", () => {
	it("児童の行を作り、トークンを返す（DBにはハッシュだけを渡す）", async () => {
		const { joinLesson, create } = setup(LESSON);

		const result = await joinLesson({ lessonId: LESSON.lessonId, name: "たろう", now: NOW });

		if (!result.ok) throw new Error(`参加できませんでした: ${result.reason}`);
		expect(create).toHaveBeenCalledTimes(1);
		expect(create).toHaveBeenCalledWith({
			lessonId: LESSON.lessonId,
			name: "たろう",
			tokenHash: hashToken(result.token),
		});
	});

	it("児童の行を入れた後に、その児童の状態を教師へ知らせる", async () => {
		const { joinLesson, calls, notifyStudentStatus } = setup(LESSON);

		await joinLesson({ lessonId: LESSON.lessonId, name: "たろう", now: NOW });

		expect(calls).toEqual(["create", "notify"]);
		expect(notifyStudentStatus).toHaveBeenCalledWith({
			lessonId: LESSON.lessonId,
			studentId: STUDENT_ID,
		});
	});

	it("本文の授業のIDが大文字でも、知らせの送り先はDBの授業のIDで引く", async () => {
		const { joinLesson, findById, create, notifyStudentStatus } = setup(LESSON);
		const upper = LESSON.lessonId.toUpperCase();

		const result = await joinLesson({ lessonId: upper, name: "たろう", now: NOW });

		expect(result.ok).toBe(true);
		expect(findById).toHaveBeenCalledWith(upper);
		expect(create).toHaveBeenCalledWith(expect.objectContaining({ lessonId: LESSON.lessonId }));
		expect(notifyStudentStatus).toHaveBeenCalledWith({
			lessonId: LESSON.lessonId,
			studentId: STUDENT_ID,
		});
	});

	it("授業がなければ、行を作らず知らせもせずにnotFoundを返す", async () => {
		const { joinLesson, create, notifyStudentStatus } = setup(null);

		const result = await joinLesson({ lessonId: LESSON.lessonId, name: "たろう", now: NOW });

		expect(result).toEqual({ ok: false, reason: "notFound" });
		expect(create).not.toHaveBeenCalled();
		expect(notifyStudentStatus).not.toHaveBeenCalled();
	});

	it("授業が終わっていれば、行を作らず知らせもせずにlessonEndedを返す", async () => {
		const { joinLesson, create, notifyStudentStatus } = setup(ENDED_LESSON);

		const result = await joinLesson({ lessonId: LESSON.lessonId, name: "たろう", now: NOW });

		expect(result).toEqual({ ok: false, reason: "lessonEnded" });
		expect(create).not.toHaveBeenCalled();
		expect(notifyStudentStatus).not.toHaveBeenCalled();
	});
});
