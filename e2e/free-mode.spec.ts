/*
 * 自由モードの主な流れ（docs/specs/single/plan.mdのタスク19、仕様はfree-mode.md）
 * 入口で自由に遊ぶ → チュートリアル1をクリア → 全部の問題を飛ばす → 迷路を作る → 読み込み直しても残る → 問題をリセットする
 * 画面の文言と移り方はfree-mode.mdとREADME.md、解答の例はdomain.mdから書いた
 *
 * - 自由モードはサーバーと通信しないので、児童用アプリの外（APIを含む）への要求が一つもないことも確かめる
 * - 「ネットを切った状態」は、児童用アプリの外への要求をすべて断ったうえで、ブラウザに`offline`を知らせて確かめる
 *   画面のコードは開発サーバーから読み込むので、ブラウザのネットそのものは切らない
 *   （すべてを端末に置いて動かすのはデスクトップアプリで、plan.mdのタスク24で確かめる）
 * - `offline`の知らせは読み込み直すと消えるので、ページを開くたびに知らせ直す
 * - 偽カメラには命令カード（FORWARD）のQRをくり返し映す。チュートリアル1は4枚でゴールに着く
 */
import { expect, test } from "@playwright/test";
import type { Locator, Page, TestInfo } from "@playwright/test";

import { STUDENT_URL } from "../playwright.config";
import { FORWARD_VIDEO_PATH } from "./support/fake-camera";
import { rubyName, rubyText } from "./support/ruby";

test.use({
	launchOptions: {
		args: [
			"--use-fake-ui-for-media-stream",
			"--use-fake-device-for-media-stream",
			`--use-file-for-fake-video-capture=${FORWARD_VIDEO_PATH}`,
		],
	},
});

const MAZE_NAME = "じゆうのめいろ";

// free-mode.mdの「記録」が決めたlocalStorageのキー
const MAZES_KEY = "kasane.free.mazes";

const PLAY_FREELY = "<ruby>自由<rt>じゆう</rt></ruby>に<ruby>遊<rt>あそ</rt></ruby>ぶ";
const JOIN_LESSON = "<ruby>授業<rt>じゅぎょう</rt></ruby>に<ruby>参加<rt>さんか</rt></ruby>する";
const SKIP = "<ruby>問題<rt>もんだい</rt></ruby>を<ruby>飛<rt>と</rt></ruby>ばす";
const SKIP_ALL =
	"<ruby>全部<rt>ぜんぶ</rt></ruby>の<ruby>問題<rt>もんだい</rt></ruby>を<ruby>飛<rt>と</rt></ruby>ばす";
const RESET = "<ruby>問題<rt>もんだい</rt></ruby>をリセットする";
const NEW_MAZE =
	"<ruby>新<rt>あたら</rt></ruby>しい<ruby>迷路<rt>めいろ</rt></ruby>を<ruby>作<rt>つく</rt></ruby>る";
const MAZE_LOCKED =
	"<ruby>問題<rt>もんだい</rt></ruby>を<ruby>全部<rt>ぜんぶ</rt></ruby>クリアすると<ruby>作<rt>つく</rt></ruby>れるよ";

type Network = "online" | "offline";

/*
 * 文言（仕様書の書き方のまま）から部品を探す。名前で探し、読み（<rt>）が文字として入っていることも条件にする
 * exactのときは、名前がその文言だけのものに限る（「問題を飛ばす」と「全部の問題を飛ばす」を分けるため）
 */
function named(
	scope: Page | Locator,
	role: "button" | "heading" | "link",
	spec: string,
	{ exact = false } = {},
): Locator {
	const name = exact ? new RegExp(`^${rubyName(spec).source}$`) : rubyName(spec);
	return scope.getByRole(role, { name }).filter({ hasText: rubyText(spec) });
}

// 押せる部品は、ボタンでもリンクでもよい（仕様書が決めているのは文言だけ）
function action(scope: Page | Locator, spec: string, options: { exact?: boolean } = {}): Locator {
	return named(scope, "button", spec, options).or(named(scope, "link", spec, options));
}

/*
 * 児童画面の「次に押すボタン」は動きで目立たせてよい（README.md「見た目と操作のルール」）
 * 動き続ける部品は、Playwrightが「止まるまで待つ」確認を通らないので、見えて押せることを確かめてから、その確認を飛ばして押す
 */
async function press(target: Locator): Promise<void> {
	await expect(target).toBeVisible();
	await expect(target).toBeEnabled();
	await target.click({ force: true });
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
	const path = testInfo.outputPath(`${name}.png`);
	await page.screenshot({ path });
	await testInfo.attach(name, { path, contentType: "image/png" });
}

/*
 * ネットにつながっていないことをブラウザから知らせる（TanStack Queryはwindowのofflineイベントで知る）
 * readyが見えてから知らせる（画面が組み上がる前に知らせると、受け取る側がまだいない）
 */
async function settle(page: Page, network: Network, ready: Locator): Promise<void> {
	await expect(ready).toBeVisible();
	if (network === "offline") {
		await page.evaluate(() => window.dispatchEvent(new Event("offline")));
	}
}

async function playFreeMode(page: Page, network: Network, testInfo: TestInfo): Promise<void> {
	page.setDefaultTimeout(10_000);

	/*
	 * 自由モードはAPIとも、ほかの外のサイトとも通信しない（free-mode.mdの「フロントエンド」）
	 * 児童用アプリの開発サーバー以外への要求を記録し、ネットを切った状態ではすべて断る
	 */
	const isOutside = (url: URL) =>
		(url.protocol === "http:" || url.protocol === "https:") && url.origin !== STUDENT_URL;
	const outsideRequests: string[] = [];
	page.on("request", (request) => {
		if (isOutside(new URL(request.url()))) outsideRequests.push(request.url());
	});
	if (network === "offline") {
		await page.route(isOutside, (route) => route.abort("internetdisconnected"));
	}

	await test.step("トークンのない端末で開くと入口へ移り、「自由に遊ぶ」でホームへ移る", async () => {
		await page.goto(`${STUDENT_URL}/`);
		await expect(page).toHaveURL(`${STUDENT_URL}/start`);
		await expect(action(page, JOIN_LESSON)).toBeVisible();
		await settle(page, network, action(page, PLAY_FREELY));
		await capture(page, testInfo, `01-${network}-入口`);

		await press(action(page, PLAY_FREELY));
		await expect(page).toHaveURL(`${STUDENT_URL}/free`);
		// 移るときにページごと読み込み直す作りでも、ネットを切った状態のまま確かめられるよう、移るたびに知らせ直す
		await settle(page, network, page.locator('a[href="/free/tutorials/1"]'));
		await capture(page, testInfo, `02-${network}-ホーム`);
	});

	await test.step("チュートリアル1を、カードを4枚読み取って動かすとクリアできる", async () => {
		await press(page.locator('a[href="/free/tutorials/1"]'));
		await expect(page).toHaveURL(`${STUDENT_URL}/free/tutorials/1`);
		await settle(
			page,
			network,
			named(page, "heading", "1. <ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>もう"),
		);

		await press(
			action(page, "この<ruby>迷路<rt>めいろ</rt></ruby>で<ruby>遊<rt>あそ</rt></ruby>ぶ"),
		);
		await expect(page).toHaveURL(`${STUDENT_URL}/free/tutorials/1/play`);
		await settle(
			page,
			network,
			named(page, "button", "ロボットを<ruby>動<rt>うご</rt></ruby>かす"),
		);

		const cards = page.getByText(
			rubyText("<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>む"),
		);
		await expect(cards.nth(3)).toBeVisible({ timeout: 30_000 });
		await press(named(page, "button", "ロボットを<ruby>動<rt>うご</rt></ruby>かす"));

		await expect(page.getByText(rubyText("ゴールに<ruby>着<rt>つ</rt></ruby>いた！"))).toBeVisible({
			timeout: 20_000,
		});
		await expect(
			action(
				page,
				"<ruby>次<rt>つぎ</rt></ruby>の<ruby>問題<rt>もんだい</rt></ruby>に<ruby>進<rt>すす</rt></ruby>む",
			),
		).toBeVisible();
	});

	await test.step("ホームの「問題を飛ばす」は、先生に確認せずに全部の問題を飛ばせる", async () => {
		await page.goto(`${STUDENT_URL}/free`);
		// 1問目をクリアしたので、2問目が開いている
		await settle(page, network, page.locator('a[href="/free/tutorials/2"]'));

		await press(action(page, SKIP, { exact: true }));
		const dialog = page.getByRole("dialog");
		await expect(
			dialog.getByText(
				rubyText("どの<ruby>問題<rt>もんだい</rt></ruby>から<ruby>始<rt>はじ</rt></ruby>める？"),
			),
		).toBeVisible();
		await expect(
			dialog.getByText(
				rubyText("<ruby>先生<rt>せんせい</rt></ruby>に<ruby>確認<rt>かくにん</rt></ruby>"),
			),
		).toHaveCount(0);

		// 選ぶものの組み方（ボタン・ラジオなど）は仕様が決めていないので、文言で押す
		await press(dialog.getByText(rubyText(SKIP_ALL)));
		await press(named(dialog, "button", SKIP, { exact: true }));
		await expect(dialog).toBeHidden();
		await expect(action(page, NEW_MAZE)).toBeEnabled();
	});

	await test.step("新しい迷路を作って保存すると、しょうさいへ移り、読み込み直しても残っている", async () => {
		await press(action(page, NEW_MAZE));
		await expect(page).toHaveURL(`${STUDENT_URL}/free/mazes/new`);
		await page
			.getByRole("textbox", {
				name: rubyName("<ruby>迷路<rt>めいろ</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>"),
			})
			.fill(MAZE_NAME);
		await press(named(page, "button", "できあがり"));

		await expect(page).toHaveURL(/\/free\/mazes\/[0-9a-f-]{36}$/);
		await expect(page.getByRole("heading", { name: MAZE_NAME })).toBeVisible();

		await page.reload();
		await settle(page, network, page.getByRole("heading", { name: MAZE_NAME }));

		await page.goto(`${STUDENT_URL}/free`);
		await settle(page, network, page.getByRole("link").filter({ hasText: MAZE_NAME }));
	});

	await test.step("「問題をリセットする」でクリア数が0に戻り、自分の迷路は消えない", async () => {
		await press(action(page, RESET, { exact: true }));
		const dialog = page.getByRole("dialog");
		await expect(
			dialog.getByText(
				rubyText(
					"<ruby>問題<rt>もんだい</rt></ruby>をリセットすると、1<ruby>問目<rt>もんめ</rt></ruby>からやり<ruby>直<rt>なお</rt></ruby>しになるよ。<ruby>自分<rt>じぶん</rt></ruby>の<ruby>迷路<rt>めいろ</rt></ruby>は<ruby>消<rt>き</rt></ruby>えないよ",
				),
			),
		).toBeVisible();
		await expect(action(dialog, "このまま<ruby>続<rt>つづ</rt></ruby>ける")).toBeVisible();
		await capture(page, testInfo, `03-${network}-問題をリセットする`);

		await press(action(dialog, RESET, { exact: true }));
		await expect(dialog).toBeHidden();

		/*
		 * 画面の表示だけでなく記録が変わったことを確かめるため、読み込み直してから見る
		 * クリア数が0なので「問題をリセットする」は出ず、自分の迷路は全部クリアし直すまで鍵のかかった表示に戻る
		 */
		await page.reload();
		await settle(page, network, page.locator('a[href="/free/tutorials/1"]'));
		await expect(action(page, RESET, { exact: true })).toHaveCount(0);
		await expect(page.getByText(rubyText(MAZE_LOCKED))).toBeVisible();
		await expect(page.getByRole("link").filter({ hasText: MAZE_NAME })).toHaveCount(0);

		// 2問目はまだ解けないので、しょうさいを開くとホームへ移る（README.mdの「もんだいのしょうさい」）
		await page.goto(`${STUDENT_URL}/free/tutorials/2`);
		await expect(page).toHaveURL(`${STUDENT_URL}/free`);

		// 自分の迷路は消えていない
		const stored = await page.evaluate((key) => localStorage.getItem(key), MAZES_KEY);
		expect(stored).toContain(MAZE_NAME);
	});

	expect(outsideRequests).toEqual([]);
}

test("自由モード: ネットにつながっているとき", async ({ page }, testInfo) => {
	// 偽カメラで4枚読み取るのに12秒ほど、ロボットが動くのに数秒かかる
	test.setTimeout(120_000);
	await playFreeMode(page, "online", testInfo);
});

test("自由モード: ネットにつながっていないとき（APIに届かず、ブラウザがofflineを知らせた後）", async ({
	page,
}, testInfo) => {
	test.setTimeout(120_000);
	await playFreeMode(page, "offline", testInfo);
});
