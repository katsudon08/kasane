/*
 * 授業を終える（仕様書backend.mdの「HTTPのAPI」のPOST /lessons/:lessonId/closeと、「サーバーからの知らせ（SSE）」）
 * 終わる時刻を上書きした後に終わりを知らせることと、知らせの送り先をDBの授業のIDで引くことを確かめる
 */
import { describe, expect, it, mock } from "bun:test";

import type { Lesson } from "../../domain/entities/lesson";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import { closeLessonUseCase } from "./close-lesson";

const NOW = new Date("2026-11-10T02:00:00.000Z");
const TEACHER = "teacher-1";

const LESSON: Lesson = {
	lessonId: "0b0f3a52-6c1d-4a59-9f5e-2f1f3c7d8e9a",
	createdAt: new Date("2026-11-10T00:00:00.000Z"),
	endsAt: new Date("2026-11-10T05:00:00.000Z"),
};
const ENDED_LESSON: Lesson = { ...LESSON, endsAt: NOW };

const setup = (lesson: Lesson | null) => {
	// 呼ばれた順番を残す
	const calls: string[] = [];
	const findByIdAndTeacher = mock(async (_lessonId: string, _teacherId: string) => lesson);
	const updateEndsAt = mock(async (_lessonId: string, _teacherId: string, _endsAt: Date) => {
		calls.push("updateEndsAt");
	});
	const sendEnded = mock((_lessonId: string) => {
		calls.push("sendEnded");
	});
	const lessonRepository: LessonRepository = {
		create: async () => LESSON.lessonId,
		findOpenByTeacher: async () => [],
		findByIdAndTeacher,
		findById: async () => lesson,
		updateEndsAt,
	};
	const closeLesson = closeLessonUseCase({ lessonRepository, lessonHub: { sendEnded } });

	return { closeLesson, calls, findByIdAndTeacher, updateEndsAt, sendEnded };
};

describe("closeLessonUseCase", () => {
	it("その教師の授業の終わる時刻を、今の時刻で上書きする", async () => {
		const { closeLesson, findByIdAndTeacher, updateEndsAt } = setup(LESSON);

		const result = await closeLesson({ teacherId: TEACHER, lessonId: LESSON.lessonId, now: NOW });

		expect(result).toEqual({ ok: true });
		expect(findByIdAndTeacher).toHaveBeenCalledWith(LESSON.lessonId, TEACHER);
		expect(updateEndsAt).toHaveBeenCalledTimes(1);
		expect(updateEndsAt).toHaveBeenCalledWith(LESSON.lessonId, TEACHER, NOW);
	});

	it("終わる時刻を上書きした後に、その授業の送り先へ終わりを知らせる", async () => {
		const { closeLesson, calls, sendEnded } = setup(LESSON);

		await closeLesson({ teacherId: TEACHER, lessonId: LESSON.lessonId, now: NOW });

		expect(calls).toEqual(["updateEndsAt", "sendEnded"]);
		expect(sendEnded).toHaveBeenCalledTimes(1);
		expect(sendEnded).toHaveBeenCalledWith(LESSON.lessonId);
	});

	it("パスの授業のIDが大文字でも、知らせの送り先はDBの授業のIDで引く", async () => {
		const { closeLesson, sendEnded } = setup(LESSON);

		const result = await closeLesson({
			teacherId: TEACHER,
			lessonId: LESSON.lessonId.toUpperCase(),
			now: NOW,
		});

		expect(result).toEqual({ ok: true });
		expect(sendEnded).toHaveBeenCalledWith(LESSON.lessonId);
	});

	it("他の教師の授業・存在しない授業は、何もせずnotFoundを返す", async () => {
		const { closeLesson, updateEndsAt, sendEnded } = setup(null);

		const result = await closeLesson({ teacherId: TEACHER, lessonId: LESSON.lessonId, now: NOW });

		expect(result).toEqual({ ok: false, reason: "notFound" });
		expect(updateEndsAt).not.toHaveBeenCalled();
		expect(sendEnded).not.toHaveBeenCalled();
	});

	it("すでに終わっている授業は、何もせずlessonEndedを返す", async () => {
		const { closeLesson, updateEndsAt, sendEnded } = setup(ENDED_LESSON);

		const result = await closeLesson({ teacherId: TEACHER, lessonId: LESSON.lessonId, now: NOW });

		expect(result).toEqual({ ok: false, reason: "lessonEnded" });
		expect(updateEndsAt).not.toHaveBeenCalled();
		expect(sendEnded).not.toHaveBeenCalled();
	});
});
