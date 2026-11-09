import { defineConfig, devices } from "@playwright/test";

/*
 * E2E（docs/specs/single/plan.md「機械的なゲート」）
 * テストはe2e/に置く。教師アプリと児童アプリの開発サーバーを起動してから実行する
 * カメラは偽の映像で動かす。QRの動画は--use-file-for-fake-video-captureでテストごとに差し込む
 */
const isCI = process.env.CI === "true";

export const TEACHER_URL = "http://localhost:5174";
export const STUDENT_URL = "http://localhost:5173";

export default defineConfig({
	testDir: "./e2e",
	outputDir: "./test-results",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI
		? [["github"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],
	use: {
		...devices["Desktop Chrome"],
		locale: "ja-JP",
		timezoneId: "Asia/Tokyo",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		permissions: ["camera"],
		launchOptions: {
			args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
		},
	},
	webServer: [
		{
			command: "pnpm --filter @kasane/teacher dev",
			url: TEACHER_URL,
			reuseExistingServer: !isCI,
			timeout: 60_000,
		},
		{
			command: "pnpm --filter @kasane/student dev",
			url: STUDENT_URL,
			reuseExistingServer: !isCI,
			timeout: 60_000,
		},
	],
});
