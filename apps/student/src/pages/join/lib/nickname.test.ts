/*
 * ニックネーム（仕様書README.mdの「授業に参加する」、backend.mdの「入力の上限」の名前）
 * - 前後の空白を削って1〜20文字
 * - 改行と制御文字は入れられない
 * 送れないときはnullを返し、画面は「この名前で始める」を押せなくする
 */
import { describe, expect, it } from "vitest";

import { nicknameOf } from "./nickname";

// 目に見えない文字は、文字コードから作る
const char = (codePoint: number) => String.fromCodePoint(codePoint);

describe("nicknameOf", () => {
	it.each([
		{ label: "ふつうの名前", input: "そらまめ", expected: "そらまめ" },
		{ label: "1文字", input: "あ", expected: "あ" },
		{ label: "20文字", input: "あ".repeat(20), expected: "あ".repeat(20) },
		{ label: "前後の空白", input: "  そらまめ　", expected: "そらまめ" },
		{ label: "前後の空白を削って20文字", input: ` ${"あ".repeat(20)} `, expected: "あ".repeat(20) },
		{ label: "間の空白", input: "そら まめ", expected: "そら まめ" },
		{ label: "英数字", input: "Sora2", expected: "Sora2" },
	])("$labelなら、送れる", ({ input, expected }) => {
		expect(nicknameOf(input)).toBe(expected);
	});

	it.each([
		{ label: "空", input: "" },
		{ label: "空白だけ", input: "   " },
		{ label: "21文字", input: "あ".repeat(21) },
		{ label: "改行", input: `そら${char(0x0a)}まめ` },
		{ label: "タブ", input: `そら${char(0x09)}まめ` },
		{ label: "制御文字", input: `そら${char(0x07)}まめ` },
		{ label: "DEL", input: `そら${char(0x7f)}まめ` },
		{ label: "C1の制御文字", input: `そら${char(0x85)}まめ` },
		{ label: "行の区切り", input: `そら${char(0x2028)}まめ` },
		{ label: "段落の区切り", input: `そら${char(0x2029)}まめ` },
	])("$labelなら、送れない", ({ input }) => {
		expect(nicknameOf(input)).toBeNull();
	});
});
