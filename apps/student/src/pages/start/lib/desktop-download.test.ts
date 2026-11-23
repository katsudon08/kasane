/*
 * 入口のダウンロードのボタンを出す端末と、ダウンロードするファイル（仕様書free-mode.mdの「入口」「配布」）
 * - WindowsかMacで開いたときだけ出す。iPad・Chromebook・スマートフォンでは出さない
 * - iPadのSafariはMacと名乗るので、タッチできる端末はMacとみなさない
 * - ボタンは`https://github.com/katsudon08/kasane/releases/latest/download/{ファイル名}`を指す
 *   ファイル名はWindowsが`KASANE-Setup.exe`、Macが`KASANE.dmg`
 */
import { describe, expect, it } from "vitest";

import { desktopDownloadUrl } from "./desktop-download";

const RELEASES = "https://github.com/katsudon08/kasane/releases/latest/download";

const WINDOWS_CHROME =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const WINDOWS_EDGE =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";
const MAC_CHROME =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
// iPadのSafariも、既定ではこれと同じMacの名乗りをする
const MAC_SAFARI =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
// iPadのSafariで、モバイル用の表示を選んだときの名乗り
const IPAD_MOBILE =
	"Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
// 今のAndroidのChromeは、機種名を隠した短い名乗りをする
const ANDROID =
	"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const CHROMEBOOK =
	"Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
// Linuxのパソコン。Androidのタブレットでパソコン用の表示を選んだときも、この名乗りになる
const LINUX =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

describe("desktopDownloadUrl", () => {
	it.each([
		{ label: "WindowsのChrome", userAgent: WINDOWS_CHROME, maxTouchPoints: 0 },
		{ label: "WindowsのEdge", userAgent: WINDOWS_EDGE, maxTouchPoints: 0 },
		{ label: "タッチできるWindows", userAgent: WINDOWS_CHROME, maxTouchPoints: 10 },
	])("$labelでは、Windowsのインストーラーを指す", (device) => {
		expect(desktopDownloadUrl(device)).toBe(`${RELEASES}/KASANE-Setup.exe`);
	});

	it.each([
		{ label: "MacのChrome", userAgent: MAC_CHROME },
		{ label: "MacのSafari", userAgent: MAC_SAFARI },
	])("$labelでは、Macのインストーラーを指す", ({ userAgent }) => {
		expect(desktopDownloadUrl({ userAgent, maxTouchPoints: 0 })).toBe(`${RELEASES}/KASANE.dmg`);
	});

	it.each([
		{ label: "Macと名乗るiPadのSafari", userAgent: MAC_SAFARI, maxTouchPoints: 5 },
		{ label: "モバイル用の表示のiPad", userAgent: IPAD_MOBILE, maxTouchPoints: 5 },
		{ label: "iPhone", userAgent: IPHONE, maxTouchPoints: 5 },
		{ label: "Androidのスマートフォン", userAgent: ANDROID, maxTouchPoints: 5 },
		{ label: "Chromebook", userAgent: CHROMEBOOK, maxTouchPoints: 0 },
		{ label: "Linuxと名乗る端末", userAgent: LINUX, maxTouchPoints: 0 },
	])("$labelでは、ボタンを出さない（null）", (device) => {
		expect(desktopDownloadUrl(device)).toBeNull();
	});
});
