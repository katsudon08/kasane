/*
 * 自由モードの自分の迷路（docs/specs/single/plan.mdのタスク21、仕様はfree-mode.mdの「記録」）
 * QRで迷路をもらう → 変える → 読み込み直しても残る → 消す、がlocalStorageの記録で動くことを確かめる
 * 新しく作る流れはfree-mode.spec.tsで確かめる
 *
 * - 迷路を作れるのは全問クリアした後なので、free-mode.mdが決めたキーにクリア数を入れてから開く
 * - 自由モードはサーバーと通信しないので、児童用アプリの外（APIを含む）への要求が一つもないことも確かめる
 * - 「ネットを切った状態」は、free-mode.spec.tsと同じく、外への要求を断ったうえでブラウザに`offline`を知らせる
 * - 偽カメラには友だちの迷路のQRを映す
 */
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { STUDENT_URL } from "../playwright.config";
import {
	FRIEND_MAZE_NAME,
	FRIEND_MAZE_VIDEO_PATH,
	IMPORT_BUTTON,
	cameraWith,
	writeFriendMazeVideo,
} from "./support/maze-qr";
import { rubyName, rubyText } from "./support/ruby";

// ブラウザーを起動する前に、偽カメラに映す動画を作っておく
writeFriendMazeVideo();

test.use(cameraWith(FRIEND_MAZE_VIDEO_PATH));

const CLEARED_COUNT_KEY = "kasane.free.clearedCount";
const TUTORIAL_COUNT = 7;
const RENAMED = "かえためいろ";

type Network = "online" | "offline";

function named(scope: Page | Locator, role: "button" | "heading" | "link", spec: string): Locator {
	return scope.getByRole(role, { name: rubyName(spec) }).filter({ hasText: rubyText(spec) });
}

function action(scope: Page | Locator, spec: string): Locator {
	return named(scope, "button", spec).or(named(scope, "link", spec));
}

async function press(target: Locator): Promise<void> {
	await expect(target).toBeVisible();
	await expect(target).toBeEnabled();
	await target.click({ force: true });
}

// readyが見えてから、ネットにつながっていないことをブラウザから知らせる（読み込み直すと消えるので、開くたびに知らせる）
async function settle(page: Page, network: Network, ready: Locator): Promise<void> {
	await expect(ready).toBeVisible();
	if (network === "offline") {
		await page.evaluate(() => window.dispatchEvent(new Event("offline")));
	}
}

async function manageMazes(page: Page, network: Network): Promise<void> {
	page.setDefaultTimeout(10_000);

	const isOutside = (url: URL) =>
		(url.protocol === "http:" || url.protocol === "https:") && url.origin !== STUDENT_URL;
	const outsideRequests: string[] = [];
	page.on("request", (request) => {
		if (isOutside(new URL(request.url()))) outsideRequests.push(request.url());
	});
	if (network === "offline") {
		await page.route(isOutside, (route) => route.abort("internetdisconnected"));
	}

	// 全問クリアしたことにする（まだ記録がないときだけ入れる。読み込み直しても上書きしない）
	await page.addInitScript(
		({ key, count }) => {
			if (localStorage.getItem(key) === null) localStorage.setItem(key, count);
		},
		{ key: CLEARED_COUNT_KEY, count: String(TUTORIAL_COUNT) },
	);

	await test.step("QRで友だちの迷路をもらうと、自分の迷路として保存され、しょうさいへ移る", async () => {
		await page.goto(`${STUDENT_URL}/free`);
		await settle(page, network, action(page, IMPORT_BUTTON));
		// ページを読み込み直さずに移るので、ホームで知らせたofflineのまま読み取って保存する
		await press(action(page, IMPORT_BUTTON));
		await expect(page).toHaveURL(`${STUDENT_URL}/free/mazes/import`);

		await expect(page).toHaveURL(/\/free\/mazes\/[0-9a-f-]{36}$/, { timeout: 15_000 });
		await expect(page.getByRole("heading", { name: FRIEND_MAZE_NAME })).toBeVisible();
	});

	await test.step("「この迷路を変える」で名前を変えて保存すると、しょうさいに新しい名前が出る", async () => {
		await press(
			action(page, "この<ruby>迷路<rt>めいろ</rt></ruby>を<ruby>変<rt>か</rt></ruby>える"),
		);
		await expect(page).toHaveURL(/\/free\/mazes\/[0-9a-f-]{36}\/edit$/);
		const nameInput = page.getByRole("textbox", {
			name: rubyName("<ruby>迷路<rt>めいろ</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>"),
		});
		await settle(page, network, nameInput);
		await nameInput.fill(RENAMED);
		await press(named(page, "button", "できあがり"));

		await expect(page).toHaveURL(/\/free\/mazes\/[0-9a-f-]{36}$/);
		await expect(page.getByRole("heading", { name: RENAMED })).toBeVisible();

		await page.reload();
		await settle(page, network, page.getByRole("heading", { name: RENAMED }));
	});

	await test.step("「この迷路を消す」で消すと、ホームへ戻り、迷路がなくなる", async () => {
		await press(action(page, "この<ruby>迷路<rt>めいろ</rt></ruby>を<ruby>消<rt>け</rt></ruby>す"));
		const dialog = page.getByRole("dialog");
		await press(action(dialog, "<ruby>迷路<rt>めいろ</rt></ruby>を<ruby>消<rt>け</rt></ruby>す"));

		await expect(page).toHaveURL(`${STUDENT_URL}/free`);
		await expect(
			page.getByText(
				rubyText(
					"まだ<ruby>迷路<rt>めいろ</rt></ruby>がないよ。<ruby>作<rt>つく</rt></ruby>ってみよう",
				),
			),
		).toBeVisible();

		// 読み込み直しても、消えたまま
		await page.reload();
		await settle(page, network, action(page, IMPORT_BUTTON));
		await expect(page.getByRole("link").filter({ hasText: RENAMED })).toHaveCount(0);
	});

	expect(outsideRequests).toEqual([]);
}

test("自由モードの自分の迷路: ネットにつながっているとき", async ({ page }) => {
	// 偽カメラの動画はQRを1秒映して2秒消すくり返しなので、読み取りまで数秒かかる
	test.setTimeout(90_000);
	await manageMazes(page, "online");
});

test("自由モードの自分の迷路: ネットにつながっていないとき", async ({ page }) => {
	test.setTimeout(90_000);
	await manageMazes(page, "offline");
});
