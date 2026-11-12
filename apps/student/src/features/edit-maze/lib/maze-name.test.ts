/*
 * 迷路の名前の初期値（仕様書README.mdの「めいろをつくる / 変える」）
 * 初期値は「めいろ1」など。保存される文字列なのでルビなし
 * 自分の迷路の名前と重ならない、いちばん小さい番号にする
 */
import { describe, expect, it } from "vitest";

import { defaultMazeName } from "./maze-name";

describe("defaultMazeName", () => {
	it("迷路が一つもなければ「めいろ1」", () => {
		expect(defaultMazeName([])).toBe("めいろ1");
	});

	it("「めいろ1」があれば「めいろ2」", () => {
		expect(defaultMazeName(["めいろ1"])).toBe("めいろ2");
	});

	it("空いている番号のうち、いちばん小さい番号にする", () => {
		expect(defaultMazeName(["めいろ2", "めいろ1", "めいろ4"])).toBe("めいろ3");
	});

	it("児童が付けた別の名前は、番号に数えない", () => {
		expect(defaultMazeName(["ぼくのめいろ", "めいろ"])).toBe("めいろ1");
	});
});
