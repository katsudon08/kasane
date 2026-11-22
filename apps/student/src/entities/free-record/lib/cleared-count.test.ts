/*
 * 自由モードのクリア数（仕様書free-mode.mdの「記録」）
 * - 「クリア数の変わり方」の表のとおりに変わること
 *   失敗したときと自分の迷路で遊んだときはクリア数が変わらないので、nextClearedCountを呼ばない
 * - localStorageから読み出したとき、0〜チュートリアルの数の整数でなければ0として扱うこと
 */
import { TUTORIALS } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { nextClearedCount, readClearedCount } from "./cleared-count";

const ALL_SKIPPED = TUTORIALS.length + 1;

describe("nextClearedCount", () => {
	it.each([
		{ current: 0, no: 1, expected: 1 },
		{ current: 3, no: 4, expected: 4 },
		{ current: 3, no: 2, expected: 3 },
		{ current: TUTORIALS.length, no: TUTORIALS.length, expected: TUTORIALS.length },
	])(
		"チュートリアル$noでゴールしたら、今のクリア数$currentと$noの大きいほう（$expected）",
		({ current, no, expected }) => {
			expect(nextClearedCount(current, { kind: "goal", no })).toBe(expected);
		},
	);

	it.each([
		{ current: 0, to: 4, expected: 3 },
		{ current: 5, to: 3, expected: 5 },
		{ current: 2, to: ALL_SKIPPED, expected: TUTORIALS.length },
	])(
		"$to問目から始めるよう飛ばしたら、今のクリア数$currentと$to - 1の大きいほう（$expected）",
		({ current, to, expected }) => {
			expect(nextClearedCount(current, { kind: "skip", to })).toBe(expected);
		},
	);

	it.each([0, 3, TUTORIALS.length])("問題をリセットしたら、クリア数%iは0になる", (current) => {
		expect(nextClearedCount(current, { kind: "reset" })).toBe(0);
	});
});

describe("readClearedCount", () => {
	it("保存されていなければ0", () => {
		expect(readClearedCount(null)).toBe(0);
	});

	it.each([0, 3, TUTORIALS.length])("保存した整数%iはそのまま読む", (count) => {
		expect(readClearedCount(JSON.stringify(count))).toBe(count);
	});

	it.each([
		{ label: "JSONとして読めない値", stored: "abc" },
		{ label: "空の文字列", stored: "" },
		{ label: "チュートリアルの数より大きい数", stored: String(TUTORIALS.length + 1) },
		{ label: "負の数", stored: "-1" },
		{ label: "整数でない数", stored: "2.5" },
		{ label: "数の形の文字列", stored: '"3"' },
		{ label: "null", stored: "null" },
	])("$labelは0として扱う", ({ stored }) => {
		expect(readClearedCount(stored)).toBe(0);
	});
});
