/*
 * URLの番号からチュートリアルを引く（仕様書README.mdの「もんだいのしょうさい」の迷路の読み方）
 * チュートリアルはpackages/coreのTUTORIALSから番号で引く（1から始まる番号。TUTORIALS[no - 1]）
 * 番号の形でない・範囲の外の値はnullにし、画面はホームへ移る
 */
import { TUTORIALS } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { tutorialOf } from "./tutorial-of";

describe("tutorialOf", () => {
	it.each(TUTORIALS.map(({ no }) => ({ no })))("「$no」なら、$no問目", ({ no }) => {
		expect(tutorialOf(String(no))).toBe(TUTORIALS[no - 1]);
	});

	it.each([
		{ param: "0" },
		{ param: String(TUTORIALS.length + 1) },
		{ param: "-1" },
		{ param: "01" },
		{ param: "1.5" },
		{ param: "1e0" },
		{ param: " 1" },
		{ param: "abc" },
		{ param: "" },
	])("「$param」なら、null", ({ param }) => {
		expect(tutorialOf(param)).toBeNull();
	});
});
