/*
 * 授業の見出し（仕様書README.mdの「教師の画面」のホームの一覧「11月5日10:40に始めた授業」、
 * backend.mdのGET /lessons/:lessonIdの「11月6日10:40に始めた授業」）
 * 時刻は教師のブラウザの時刻で表すので、テストの日時もその場の時刻で作る
 */
import { describe, expect, it } from "vitest";

import { lessonTitle } from "./lesson-title";

describe("lessonTitle", () => {
	it("始めた月日と時刻から、授業の見出しを作る", () => {
		expect(lessonTitle(new Date(2026, 10, 5, 10, 40))).toBe("11月5日10:40に始めた授業");
	});

	it("分が1桁のときは、0を足して2桁にする", () => {
		expect(lessonTitle(new Date(2026, 10, 6, 10, 5))).toBe("11月6日10:05に始めた授業");
	});
});
