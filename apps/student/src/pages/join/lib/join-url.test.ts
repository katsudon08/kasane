/*
 * 授業QRの中身から授業のIDを取り出す（仕様書README.mdの「授業に参加する」）
 * 授業QRには{STUDENT_ORIGIN}/join?lesson={授業のID}のURLが入っている
 * 授業のIDはlessons.id（gen_random_uuid()）なので、UUIDの形だけを通す（backend.mdの「トークン」の授業のID）
 */
import { describe, expect, it } from "vitest";

import { isLessonId, lessonIdFromJoinUrl } from "./join-url";

const ORIGIN = "https://student.example.com";
const LESSON_ID = "0b6f8c1e-3f5a-4d2b-9c7e-1a2b3c4d5e6f";

describe("isLessonId", () => {
	it.each([
		{ value: LESSON_ID, expected: true },
		{ value: LESSON_ID.toUpperCase(), expected: true },
		{ value: "", expected: false },
		{ value: "abc", expected: false },
		{ value: `${LESSON_ID}x`, expected: false },
		{ value: ` ${LESSON_ID}`, expected: false },
		{ value: "0b6f8c1e3f5a4d2b9c7e1a2b3c4d5e6f", expected: false },
		{ value: `urn:uuid:${LESSON_ID}`, expected: false },
		{ value: "../students", expected: false },
	])("「$value」は$expected", ({ value, expected }) => {
		expect(isLessonId(value)).toBe(expected);
	});
});

describe("lessonIdFromJoinUrl", () => {
	it("授業QRのURLなら、授業のIDを返す", () => {
		expect(lessonIdFromJoinUrl(`${ORIGIN}/join?lesson=${LESSON_ID}`, ORIGIN)).toBe(LESSON_ID);
	});

	it("ほかの項目が付いていても、授業のIDを返す", () => {
		expect(lessonIdFromJoinUrl(`${ORIGIN}/join?from=qr&lesson=${LESSON_ID}`, ORIGIN)).toBe(
			LESSON_ID,
		);
	});

	it.each([
		{ label: "命令カードのQR", text: "FORWARD" },
		{ label: "URLでない文字", text: "こんにちは" },
		{ label: "空", text: "" },
		{ label: "別のオリジン", text: `https://evil.example.com/join?lesson=${LESSON_ID}` },
		{ label: "httpとhttpsの違い", text: `http://student.example.com/join?lesson=${LESSON_ID}` },
		{ label: "/joinでないパス", text: `${ORIGIN}/ended?lesson=${LESSON_ID}` },
		{ label: "授業のIDがない", text: `${ORIGIN}/join` },
		{ label: "授業のIDが空", text: `${ORIGIN}/join?lesson=` },
		{ label: "授業のIDの形でない", text: `${ORIGIN}/join?lesson=abc` },
	])("$labelなら、null", ({ text }) => {
		expect(lessonIdFromJoinUrl(text, ORIGIN)).toBeNull();
	});
});
