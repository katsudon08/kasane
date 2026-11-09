import { describe, expect, test } from "bun:test";

import type { Card } from "./card";
import { SCAN_INTERVAL_MS, isNewScan, parseCard } from "./card";

describe("parseCard", () => {
	test.each<[string, Card]>([
		["FORWARD", { type: "forward" }],
		["RIGHT", { type: "right" }],
		["LEFT", { type: "left" }],
		["HOLE", { type: "fill" }],
		["LOOP", { type: "repeat" }],
		["END", { type: "end" }],
	])("QRの中身%sをカードにする", (text, card) => {
		expect(parseCard(text)).toEqual(card);
	});

	test("前後の空白を取ってから比べる", () => {
		expect(parseCard("  FORWARD \n")).toEqual({ type: "forward" });
	});

	test.each(["forward", "loop", "Forward", "FOR WARD", "", "終わり", "https://example.com"])(
		"表にない%sはnull（KASANEのカードでない）",
		(text) => {
			expect(parseCard(text)).toBeNull();
		},
	);
});

describe("isNewScan", () => {
	test("間隔は1500ms", () => {
		expect(SCAN_INTERVAL_MS).toBe(1500);
	});

	test("一度も見ていないQRは受け付ける", () => {
		expect(isNewScan("FORWARD", 10_000, {})).toBe(true);
	});

	test("同じ中身を最後に見てから1500ms未満なら受け付けない", () => {
		expect(isNewScan("FORWARD", 10_000, { FORWARD: 8_501 })).toBe(false);
		expect(isNewScan("FORWARD", 10_000, { FORWARD: 10_000 })).toBe(false);
	});

	test("同じ中身を最後に見てから1500ms以上たっていれば受け付ける", () => {
		expect(isNewScan("FORWARD", 10_000, { FORWARD: 8_500 })).toBe(true);
		expect(isNewScan("FORWARD", 10_000, { FORWARD: 0 })).toBe(true);
	});

	test("別の中身のQRは、直前に他のQRを見ていても受け付ける", () => {
		expect(isNewScan("RIGHT", 10_000, { FORWARD: 9_900 })).toBe(true);
	});

	test("lastSeenAtを書き換えない", () => {
		const lastSeenAt = { FORWARD: 9_900 };
		isNewScan("FORWARD", 10_000, lastSeenAt);
		expect(lastSeenAt).toEqual({ FORWARD: 9_900 });
	});
});
