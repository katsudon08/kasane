/*
 * 参加できなかったときの表示（仕様書README.mdの「授業に参加する」の失敗時の表示、backend.mdの「エラーの応答」）
 * POST /studentsの状態から、どの文言を出すかを決める
 * - 授業がない（404）・授業のIDの形が正しくない（422）: 授業のIDが正しくない
 * - 授業が終わっている（410）
 * - 授業の児童の数が上限に達している（403 lessonFull）
 * - 通信できない（Edenは通信の失敗を503で返す）。サーバーの不調も、もう一度押すしかないので同じ扱い
 */
import { describe, expect, it } from "vitest";

import { joinFailureOf } from "./join-failure";

describe("joinFailureOf", () => {
	it.each([
		{ status: 404, expected: "invalidLesson" },
		{ status: 422, expected: "invalidLesson" },
		{ status: 410, expected: "lessonEnded" },
		{ status: 403, expected: "lessonFull" },
		{ status: 503, expected: "offline" },
		{ status: 500, expected: "offline" },
		{ status: 502, expected: "offline" },
		{ status: 413, expected: "offline" },
	] as const)("状態が$statusなら、$expected", ({ status, expected }) => {
		expect(joinFailureOf(status)).toBe(expected);
	});
});
