/*
 * 進み具合の「進み」の表示（仕様書README.mdの「進み具合」の表、「決定事項」の教師に見せる状態）
 * - 「チュートリアルの何問目/全体」と進捗バー。何問目は、今の問題（クリア数＋1。backend.mdの「教師に見せる状態の求め方」）
 * - すべてクリアしたら、星のアイコン＋「チュートリアルをすべてクリア」
 * - 進捗バーは、クリアした問題の割合（0〜100）
 */
import { describe, expect, it } from "vitest";

import { tutorialProgress } from "./tutorial-progress";

const TUTORIAL_COUNT = 7;

describe("tutorialProgress", () => {
	it.each([
		{ clearedCount: 0, label: "チュートリアル1/7", percent: 0 },
		{ clearedCount: 2, label: "チュートリアル3/7", percent: (2 / 7) * 100 },
		{ clearedCount: 6, label: "チュートリアル7/7", percent: (6 / 7) * 100 },
	])(
		"クリア数が$clearedCountなら、「$label」と、クリアした割合の進捗バー",
		({ clearedCount, label, percent }) => {
			expect(tutorialProgress(clearedCount, TUTORIAL_COUNT)).toEqual({
				allCleared: false,
				label,
				percent,
			});
		},
	);

	it("全問クリアしたら、すべてクリア", () => {
		expect(tutorialProgress(7, TUTORIAL_COUNT)).toEqual({ allCleared: true });
	});

	it("クリア数がチュートリアルの数より多くても、すべてクリア", () => {
		expect(tutorialProgress(8, TUTORIAL_COUNT)).toEqual({ allCleared: true });
	});
});
