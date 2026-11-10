import { describe, expect, test } from "bun:test";

import { LESSON_DURATION_MS, isLessonEnded, lessonEndsAt } from "./lesson";

describe("授業の終わり", () => {
	test("LESSON_DURATION_MSは5時間", () => {
		expect(LESSON_DURATION_MS).toBe(5 * 60 * 60 * 1000);
	});

	test("lessonEndsAtはcreatedAtの5時間後", () => {
		const createdAt = new Date("2026-11-09T00:00:00.000Z");
		expect(lessonEndsAt(createdAt)).toEqual(new Date("2026-11-09T05:00:00.000Z"));
		// 元のDateを書き換えない
		expect(createdAt).toEqual(new Date("2026-11-09T00:00:00.000Z"));
	});

	describe("isLessonEnded", () => {
		const lesson = { endsAt: new Date("2026-11-09T05:00:00.000Z") };

		test("endsAtより前なら終わっていない", () => {
			expect(isLessonEnded(lesson, new Date("2026-11-09T04:59:59.999Z"))).toBe(false);
		});

		test("endsAtちょうどなら終わっている", () => {
			expect(isLessonEnded(lesson, new Date("2026-11-09T05:00:00.000Z"))).toBe(true);
		});

		test("endsAtを過ぎていれば終わっている", () => {
			expect(isLessonEnded(lesson, new Date("2026-11-10T00:00:00.000Z"))).toBe(true);
		});
	});
});
