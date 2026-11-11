/*
 * ホームの問題のカードの状態（仕様書README.mdの「ホーム」、domain.mdの「進み具合のルール」）
 * - クリア済み: 番号がクリア数以下
 * - 次に解く問題: クリア数＋1
 * - まだ解けない問題: それより後（isTutorialUnlockedが偽）
 */
import { TUTORIALS } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { tutorialCardState } from "./tutorial-card-state";

const LAST = TUTORIALS.length;

describe("tutorialCardState", () => {
	it.each([
		{ no: 1, clearedCount: 0, expected: "next" },
		{ no: 2, clearedCount: 0, expected: "locked" },
		{ no: LAST, clearedCount: 0, expected: "locked" },
		{ no: 1, clearedCount: 1, expected: "cleared" },
		{ no: 2, clearedCount: 1, expected: "next" },
		{ no: 3, clearedCount: 1, expected: "locked" },
		{ no: 3, clearedCount: 3, expected: "cleared" },
		{ no: 4, clearedCount: 3, expected: "next" },
		{ no: LAST, clearedCount: LAST - 1, expected: "next" },
		{ no: LAST, clearedCount: LAST, expected: "cleared" },
		{ no: 1, clearedCount: LAST, expected: "cleared" },
	] as const)(
		"クリア数が$clearedCountなら、$no問目は$expected",
		({ no, clearedCount, expected }) => {
			expect(tutorialCardState(no, clearedCount)).toBe(expected);
		},
	);

	it("全部クリアするまでは、次に解く問題がちょうど一つある", () => {
		for (let clearedCount = 0; clearedCount < LAST; clearedCount++) {
			const states = TUTORIALS.map(({ no }) => tutorialCardState(no, clearedCount));
			expect(states.filter((state) => state === "next")).toHaveLength(1);
		}
	});

	it("全部クリアしたら、次に解く問題もまだ解けない問題もない", () => {
		const states = TUTORIALS.map(({ no }) => tutorialCardState(no, LAST));
		expect(states.every((state) => state === "cleared")).toBe(true);
	});
});
