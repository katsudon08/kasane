/*
 * 入口の背景の画像を書き出す（仕様書free-mode.mdの「背景の画像」）
 * scene.tsの3Dの場面を開発用のサーバーで開き、ヘッドレスのChromiumで撮ってJPEGで保存する
 * 場面を直したら、pnpm --filter @kasane/student render:start-backgroundで書き出し直す
 */
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUTPUT = fileURLToPath(
	new URL("../../src/pages/start/ui/start-background.jpg", import.meta.url),
);
// 16:9。4:3の画面では左右が切り取られる（scene.ts）
const WIDTH = 1920;
const HEIGHT = 1080;
const PORT = 5190;

const server = await createServer({
	root: ROOT,
	// アプリのビルドの設定（ルートの生成など）は使わない
	configFile: false,
	logLevel: "error",
	server: { port: PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
try {
	const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
	await page.goto(`http://localhost:${PORT}/scripts/start-background/index.html`);
	await page.waitForFunction("window.startBackgroundRendered === true", undefined, {
		timeout: 120_000,
	});
	await page.screenshot({ path: OUTPUT, type: "jpeg", quality: 82 });
} finally {
	await browser.close();
	await server.close();
}
