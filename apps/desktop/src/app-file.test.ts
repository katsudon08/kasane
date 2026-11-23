/*
 * デスクトップアプリが、画面のアドレスのパスから返す児童用アプリのファイル（仕様書free-mode.mdの「デスクトップアプリ」）
 * - 児童用アプリのビルドを同梱して開く。どのパスで開いても画面として動くよう、画面のルートにはindex.htmlを返す
 * - ビルドの外のファイルは返さない
 */
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { appFilePath } from "./app-file.ts";

const ROOT = join("/", "kasane", "student");

describe("画面のルート（拡張子のないパス）にはindex.htmlを返す", () => {
	test.each(["/", "/free", "/free/", "/free/tutorials/1/play", "/start", "/free/mazes/new"])(
		"%s",
		(pathname) => {
			expect(appFilePath(ROOT, pathname)).toBe(join(ROOT, "index.html"));
		},
	);
});

describe("ファイル（拡張子のあるパス）は、ビルドの中のそのファイルを返す", () => {
	test.each([
		["/index.html", join(ROOT, "index.html")],
		["/assets/index-Bq3x9.js", join(ROOT, "assets", "index-Bq3x9.js")],
		["/assets/robot-Df21a.glb", join(ROOT, "assets", "robot-Df21a.glb")],
		// 文字は%で書かれて届くので、もとに戻して探す
		["/assets/%E3%81%82.png", join(ROOT, "assets", "あ.png")],
	])("%s", (pathname, file) => {
		expect(appFilePath(ROOT, pathname)).toBe(file);
	});
});

describe("ビルドの外を指すパスには何も返さない", () => {
	test.each([
		"/%2e%2e/secret.txt",
		"/assets/..%2f..%2fsecret.js",
		"/assets/%2e%2e/%2e%2e/secret.js",
		// 正しくない%の書き方
		"/assets/%E0%A4%A.js",
		// 途中で終わる文字（ヌル文字）
		"/index.html%00.png",
	])("%s", (pathname) => {
		expect(appFilePath(ROOT, pathname)).toBeNull();
	});
});
