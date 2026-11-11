/*
 * SSEのつなぎ直し（仕様書backend.mdの「再接続」）
 * 教師用・児童用の受け取り口で同じ決まりを使う
 * - 間隔は固定3秒に0〜1秒のばらつきを足す
 * - 画面が見えていない間と、navigator.onLineがfalseの間はつなぎ直さない
 */
import { describe, expect, it } from "vitest";

import { canReconnect, reconnectDelayMs } from "./reconnect";

describe("reconnectDelayMs", () => {
	it.each([
		{ random: 0, delayMs: 3000 },
		{ random: 0.5, delayMs: 3500 },
		{ random: 0.25, delayMs: 3250 },
	])("ばらつきの元が$randomなら、$delayMsミリ秒待つ", ({ random, delayMs }) => {
		expect(reconnectDelayMs(random)).toBe(delayMs);
	});

	it("ばらつきの元が1に近くても、4秒より短い", () => {
		expect(reconnectDelayMs(0.9999)).toBeLessThan(4000);
		expect(reconnectDelayMs(0.9999)).toBeGreaterThanOrEqual(3000);
	});
});

describe("canReconnect", () => {
	it.each([
		{ visibilityState: "visible", onLine: true, expected: true },
		{ visibilityState: "hidden", onLine: true, expected: false },
		{ visibilityState: "visible", onLine: false, expected: false },
		{ visibilityState: "hidden", onLine: false, expected: false },
	] as const)(
		"画面が$visibilityState・onLineが$onLineなら、$expected",
		({ visibilityState, onLine, expected }) => {
			expect(canReconnect({ visibilityState, onLine })).toBe(expected);
		},
	);
});
