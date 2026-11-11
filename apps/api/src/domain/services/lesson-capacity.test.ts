/*
 * 1授業の児童の数の上限（仕様書backend.mdの「入力の上限」の「1授業の児童の数」）
 * 300人まで。その授業のstudentsの行が300以上なら、これ以上参加できない
 */
import { describe, expect, it } from "bun:test";

import { MAX_STUDENTS_PER_LESSON, isLessonFull } from "./lesson-capacity";

describe("MAX_STUDENTS_PER_LESSON", () => {
	it("300人", () => {
		expect(MAX_STUDENTS_PER_LESSON).toBe(300);
	});
});

describe("isLessonFull", () => {
	it.each([
		{ studentCount: 0, full: false },
		{ studentCount: 299, full: false },
		{ studentCount: 300, full: true },
		// 参加が重なって、上限を数人超えた後
		{ studentCount: 301, full: true },
	])("児童の行が$studentCount: $full", ({ studentCount, full }) => {
		expect(isLessonFull(studentCount)).toBe(full);
	});
});
