/*
 * デスクトップアプリで開いたときの決まり（仕様書free-mode.mdの「デスクトップアプリ」）
 * - デスクトップアプリは、児童用アプリのビルドを専用のアドレス（kasane://app/）で開く。アドレスの形でデスクトップかを見分ける
 * - 起動すると/freeを開く。/freeの外のルートを開こうとしたら/freeへ移る
 */
import { describe, expect, test } from "vitest";

import { isDesktopProtocol, outsideFreeMode } from "./desktop";

describe("デスクトップアプリかどうかは、アドレスの形（プロトコル）で見分ける", () => {
	test.each([
		["kasane:", true],
		["http:", false],
		["https:", false],
		["file:", false],
	])("%s", (protocol, expected) => {
		expect(isDesktopProtocol(protocol)).toBe(expected);
	});
});

describe("/freeの下は開ける", () => {
	test.each([
		"/free",
		"/free/",
		"/free/tutorials/1",
		"/free/tutorials/1/play",
		"/free/mazes/new",
		"/free/mazes/import",
	])("%s", (pathname) => {
		expect(outsideFreeMode(pathname)).toBe(false);
	});
});

describe("/freeの外は開けない（/freeへ移る）", () => {
	test.each(["/", "/start", "/join", "/ended", "/tutorials/1", "/mazes/new", "/freedom"])(
		"%s",
		(pathname) => {
			expect(outsideFreeMode(pathname)).toBe(true);
		},
	);
});
