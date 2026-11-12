import { defineConfig, devices } from "@playwright/test";

/*
 * E2E（docs/specs/single/plan.md「機械的なゲート」）
 * テストはe2e/に置く。API・教師アプリ・児童アプリの開発サーバーを起動してから実行する
 * APIは開発用のDB（手元はNeonのdevelopブランチ、CIはPostgresのコンテナ）につなぐ。テスト用のDBは
 * APIのテストが毎回空にするので使わない
 * カメラは偽の映像で動かす。QRの動画は実行の前に作り（e2e/global-setup.ts）、
 * --use-file-for-fake-video-captureでテストごとに差し込む
 */
const isCI = process.env.CI === "true";

export const API_URL = "http://localhost:3000";
export const TEACHER_URL = "http://localhost:5174";
export const STUDENT_URL = "http://localhost:5173";

export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	outputDir: "./test-results",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	workers: isCI ? 1 : undefined,
	// 開発用のDB（Neon）は、しばらく使っていないと最初の応答が遅いので、既定の5秒より長く待つ
	expect: { timeout: 10_000 },
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
			command: "pnpm --filter @kasane/api dev",
			url: `${API_URL}/health`,
			reuseExistingServer: !isCI,
			timeout: 60_000,
			/*
			 * pnpmとdotenvは子を別のプロセスグループで起動するので、既定の止め方（グループへのSIGKILL）ではbunが残り、
			 * Playwrightが終わらなくなる。SIGTERMならpnpmからbunまで順に伝わる
			 */
			gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
		},
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
