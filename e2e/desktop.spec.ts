/*
 * デスクトップアプリ（docs/specs/single/plan.mdのタスク24、仕様はfree-mode.mdの「デスクトップアプリ」）
 * - 起動すると/freeが開く。入口がないので、ホームに入口へ戻るリンクを出さない
 * - ネットを切った状態で、カメラでカードを読んでチュートリアル1をクリアできる
 * - /freeの外へは移れない（/freeへ移る）
 *
 * - 児童用アプリのビルド（apps/student/dist）と、デスクトップアプリのビルド（apps/desktop/dist）を使う。E2Eの前にTurborepoが作る
 * - 画面は、アプリに同梱した児童用アプリのファイルから、専用のアドレス（kasane://app/）で開く
 * - 「ネットを切った状態」は、BrowserContextのsetOfflineで切ってから開き直し、そのまま最後まで遊んで確かめる
 *   あわせて、アプリの外（http・https）への要求が一つもないことも確かめる
 * - 偽カメラは、ウェブのE2Eと同じくChromiumの起動の引数で渡す。カメラの許可を自動で出す引数は渡さない
 *   （アプリがカメラを許すことも確かめる）
 * - CI（Linux）は画面のないマシンなので、Chromiumのサンドボックスを切り、WebGLをソフトウェアで動かす
 */
import { createRequire } from "node:module";
import { join } from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { FORWARD_VIDEO_PATH } from "./support/fake-camera";
import { rubyName, rubyText } from "./support/ruby";

const DESKTOP_DIR = join(import.meta.dirname, "..", "apps", "desktop");
const APP_URL = "kasane://app";
const isCI = process.env.CI === "true";

// electronのパッケージは、Electronの実行ファイルのパスを返す（実行ファイルがまだないときは、ここで落とす）
function electronPath(): string {
	const path: unknown = createRequire(join(DESKTOP_DIR, "package.json"))("electron");
	if (typeof path !== "string") throw new Error("Electronの実行ファイルが見つからない");
	return path;
}

// 文言（仕様書の書き方のまま）から部品を探す。名前で探し、読み（<rt>）が文字として入っていることも条件にする
function named(page: Page, role: "button" | "heading" | "link", spec: string): Locator {
	return page.getByRole(role, { name: rubyName(spec) }).filter({ hasText: rubyText(spec) });
}

// 押せる部品は、ボタンでもリンクでもよい（仕様書が決めているのは文言だけ）
function action(page: Page, spec: string): Locator {
	return named(page, "button", spec).or(named(page, "link", spec));
}

// 動きで目立たせている部品も押せるよう、見えて押せることを確かめてから、止まるまで待つ確認を飛ばして押す
async function press(target: Locator): Promise<void> {
	await expect(target).toBeVisible();
	await expect(target).toBeEnabled();
	await target.click({ force: true });
}

test("起動すると/freeが開き、ネットを切ってもカードを読んでチュートリアル1をクリアでき、/freeの外へは移れない", async () => {
	// 偽カメラで4枚読み取るのに12秒ほど、ロボットが動くのに数秒かかる
	test.setTimeout(120_000);

	const app = await electron.launch({
		executablePath: electronPath(),
		args: [
			DESKTOP_DIR,
			"--use-fake-device-for-media-stream",
			`--use-file-for-fake-video-capture=${FORWARD_VIDEO_PATH}`,
			...(isCI ? ["--no-sandbox", "--enable-unsafe-swiftshader"] : []),
		],
	});

	try {
		const page = await app.firstWindow();
		page.setDefaultTimeout(10_000);
		const home = page.locator('a[href="/free/tutorials/1"]');

		await test.step("起動すると/freeが開き、入口へ戻るリンクは出ない", async () => {
			await expect(page).toHaveURL(`${APP_URL}/free`);
			await expect(home).toBeVisible();
			await expect(page.locator('a[href="/start"]')).toHaveCount(0);
		});

		const outsideRequests: string[] = [];
		await test.step("ネットを切って開き直しても、ホームが開く", async () => {
			const context = app.context();
			context.on("request", (request) => {
				const { protocol } = new URL(request.url());
				if (protocol === "http:" || protocol === "https:") outsideRequests.push(request.url());
			});
			await context.setOffline(true);

			await page.reload();
			await expect(page).toHaveURL(`${APP_URL}/free`);
			await expect(home).toBeVisible();
			expect(await page.evaluate(() => navigator.onLine)).toBe(false);
		});

		await test.step("チュートリアル1を、カードを4枚読み取って動かすとクリアできる", async () => {
			await press(home);
			await expect(page).toHaveURL(`${APP_URL}/free/tutorials/1`);
			await expect(
				named(page, "heading", "1. <ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>もう"),
			).toBeVisible();

			await press(
				action(page, "この<ruby>迷路<rt>めいろ</rt></ruby>で<ruby>遊<rt>あそ</rt></ruby>ぶ"),
			);
			await expect(page).toHaveURL(`${APP_URL}/free/tutorials/1/play`);

			const cards = page.getByText(
				rubyText("<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>む"),
			);
			await expect(cards.nth(3)).toBeVisible({ timeout: 30_000 });
			await press(named(page, "button", "ロボットを<ruby>動<rt>うご</rt></ruby>かす"));

			await expect(
				page.getByText(rubyText("ゴールに<ruby>着<rt>つ</rt></ruby>いた！")),
			).toBeVisible({
				timeout: 20_000,
			});
		});

		await test.step("/freeの外を開こうとしても、/freeへ移る", async () => {
			for (const path of ["/start", "/", "/join"]) {
				await page.goto(`${APP_URL}${path}`);
				await expect(page).toHaveURL(`${APP_URL}/free`);
			}
		});

		await test.step("アプリの外（ネット）への要求を一つも出していない", () => {
			expect(outsideRequests).toEqual([]);
		});
	} finally {
		await app.close();
	}
});
