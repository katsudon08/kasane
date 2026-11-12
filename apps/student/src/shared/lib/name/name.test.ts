/*
 * 入力欄の名前を上限の文字数で切る（仕様書backend.mdの「入力の上限」の名前・迷路の名前の20文字）
 * iPadのSafariは、日本語の変換中にmaxlengthを超えて入ることがあるので、変換が終わったところで切る
 * 数え方はAPI（TypeBoxのmaxLength）と同じUTF-16の単位。絵文字などの2単位の字を半分で切らない
 */
import { describe, expect, it } from "vitest";

import { NAME_MAX_LENGTH, limitName } from "./name";

describe("limitName", () => {
	it("上限までの名前はそのまま", () => {
		const name = "あ".repeat(NAME_MAX_LENGTH);

		expect(limitName(name)).toBe(name);
	});

	it("上限を超えた分を切る", () => {
		expect(limitName("あ".repeat(NAME_MAX_LENGTH + 5))).toBe("あ".repeat(NAME_MAX_LENGTH));
	});

	it("2単位の字が上限をまたぐときは、その字ごと外す", () => {
		const name = `${"あ".repeat(NAME_MAX_LENGTH - 1)}😀`;

		expect(limitName(name)).toBe("あ".repeat(NAME_MAX_LENGTH - 1));
	});

	it("空の名前はそのまま", () => {
		expect(limitName("")).toBe("");
	});
});
