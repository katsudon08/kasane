/*
 * トークンの発行とハッシュ（仕様書backend.mdの「トークン」）
 */
import { describe, expect, it } from "bun:test";

import { generateToken, hashToken } from "./token";

describe("generateToken", () => {
	it("32バイトの乱数をbase64urlにした43文字を返す", () => {
		const token = generateToken();

		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(Buffer.from(token, "base64url")).toHaveLength(32);
	});

	it("呼ぶたびに別のトークンを返す", () => {
		const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));

		expect(tokens.size).toBe(100);
	});
});

describe("hashToken", () => {
	it("SHA-256を16進の64文字で返す", () => {
		// FIPS 180-2のテストベクトル
		expect(hashToken("abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});

	it("同じトークンからは同じハッシュを返す（ソルトを付けない）", () => {
		const token = generateToken();

		expect(hashToken(token)).toBe(hashToken(token));
	});

	it("別のトークンからは別のハッシュを返す", () => {
		expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
	});

	it("ハッシュにトークンそのものは含まれない", () => {
		const token = generateToken();

		expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
		expect(hashToken(token)).not.toContain(token);
	});
});
