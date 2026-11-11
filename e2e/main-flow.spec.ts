/*
 * 主要な流れ（docs/specs/single/plan.md「機械的なゲート」のE2E）
 * 授業を始める→参加→チュートリアル1をクリア→迷路を作る→授業を終える
 * 画面の文言と移り方はdocs/specs/single/README.md、APIはbackend.md、解答の例はdomain.mdから書いた
 *
 * - 参加は、授業QRの中身（{STUDENT_ORIGIN}/join?lesson={授業のID}）のURLを直接開く。授業QRは授業ごとに中身が変わり、
 *   前もって動画にできないため（カメラアプリで読み取ったときと同じ入り方）
 * - 偽カメラには命令カード（FORWARD）のQRをくり返し映す。チュートリアル1は4枚でゴールに着き、
 *   その後のカードは実行されないので（domain.md「成功・失敗の判定」）、5枚以上読み取っても結果は変わらない
 * - 迷路を作れるのは全問クリアした後なので、チュートリアル2〜7はAPIを直接呼んでクリアする
 */
import { expect, test } from "@playwright/test";
import type { Locator, Page, TestInfo } from "@playwright/test";

import { API_URL, STUDENT_URL, TEACHER_URL } from "../playwright.config";
import { FORWARD_VIDEO_PATH } from "./support/fake-camera";
import { rubyName, rubyText } from "./support/ruby";
import { TUTORIAL_SOLUTIONS } from "./support/solutions";

test.use({
	launchOptions: {
		args: [
			"--use-fake-ui-for-media-stream",
			"--use-fake-device-for-media-stream",
			`--use-file-for-fake-video-capture=${FORWARD_VIDEO_PATH}`,
		],
	},
});

const NICKNAME = "そらまめ";
const MAZE_NAME = "はじめてのめいろ";
const TUTORIAL_COUNT = 7;

/*
 * 文言（仕様書の書き方のまま）から部品を探す。名前で探し、読み（<rt>）が文字として入っていることも条件にする
 * ルビのない文言（教師画面など）は、そのままの文字で探すことになる
 */
function named(page: Page, role: "button" | "heading" | "link", spec: string): Locator {
	return page.getByRole(role, { name: rubyName(spec) }).filter({ hasText: rubyText(spec) });
}

// 押せる部品は、ボタンでもリンクでもよい（仕様書が決めているのは文言だけ）
function action(page: Page, spec: string): Locator {
	return named(page, "button", spec).or(named(page, "link", spec));
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

// 主要画面のスクリーンショットを、テストの出力先とレポートの両方に残す
async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
	const path = testInfo.outputPath(`${name}.png`);
	await page.screenshot({ path });
	await testInfo.attach(name, { path, contentType: "image/png" });
}

function lessonIdOf(url: string): string {
	const lessonId = /\/lessons\/([0-9a-f-]{36})\/invite$/.exec(url)?.[1];
	if (lessonId === undefined) throw new Error(`授業のIDがURLにない: ${url}`);
	return lessonId;
}

function tokenOf(body: unknown): string {
	if (
		typeof body === "object" &&
		body !== null &&
		"token" in body &&
		typeof body.token === "string"
	) {
		return body.token;
	}
	throw new Error("POST /studentsの応答にtokenがない");
}

test("授業を始める→参加→チュートリアル1をクリア→迷路を作る→授業を終える", async ({
	browser,
	page: student,
	request,
}, testInfo) => {
	// 偽カメラで4枚読み取るのに12秒ほど、ロボットが動くのに数秒かかる
	test.setTimeout(120_000);

	const teacherContext = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo" });
	const teacher = await teacherContext.newPage();
	// 押す相手が出てこないときに、テスト全体の制限時間まで待たずに失敗させる
	teacher.setDefaultTimeout(10_000);
	student.setDefaultTimeout(10_000);

	const lessonId = await test.step("教師: 授業を始めると、QRコードを見せる画面へ移る", async () => {
		await teacher.goto(`${TEACHER_URL}/`);
		await capture(teacher, testInfo, "01-教師-ホーム");
		await teacher.getByRole("button", { name: "授業を始める" }).click();

		await expect(teacher).toHaveURL(/\/lessons\/[0-9a-f-]{36}\/invite$/);
		await expect(
			teacher.getByText("児童のタブレットのカメラで、このQRコードを読み取ってください"),
		).toBeVisible();
		await capture(teacher, testInfo, "02-教師-QRコードを見せる");
		return lessonIdOf(teacher.url());
	});

	const token = await test.step("児童: ニックネームを入れて参加すると、ホームへ移る", async () => {
		await student.goto(`${STUDENT_URL}/join?lesson=${lessonId}`);
		await expect(
			student.getByText(rubyText("ニックネームを<ruby>入<rt>い</rt></ruby>れてね")),
		).toBeVisible();

		const start = named(
			student,
			"button",
			"この<ruby>名前<rt>なまえ</rt></ruby>で<ruby>始<rt>はじ</rt></ruby>める",
		);
		await expect(start).toBeDisabled();
		await student
			.getByRole("textbox", { name: rubyName("ニックネームを<ruby>入<rt>い</rt></ruby>れてね") })
			.fill(NICKNAME);
		await capture(student, testInfo, "03-児童-授業に参加する");

		const joined = student.waitForResponse(
			(response) =>
				response.request().method() === "POST" && new URL(response.url()).pathname === "/students",
		);
		await press(start);
		const response = await joined;
		expect(response.status()).toBe(201);
		// 画面が移ると応答の本文を読めなくなることがあるので、先に読む
		const studentToken = tokenOf(await response.json());

		await expect(student).toHaveURL(`${STUDENT_URL}/`);
		await expect(student.getByText(NICKNAME)).toBeVisible();
		await capture(student, testInfo, "04-児童-ホーム");
		return studentToken;
	});

	await test.step("教師: 進み具合に、参加した児童が出る", async () => {
		await action(teacher, "進み具合を見る").click();

		await expect(teacher).toHaveURL(`${TEACHER_URL}/lessons/${lessonId}`);
		await expect(teacher.getByText(NICKNAME)).toBeVisible();
		await expect(teacher.getByText(`チュートリアル1/${TUTORIAL_COUNT}`)).toBeVisible();
		await expect(teacher.getByText("まだ送っていない")).toBeVisible();
		await capture(teacher, testInfo, "05-教師-進み具合");
	});

	await test.step("児童: チュートリアル1のしょうさいから、プレイへ移る", async () => {
		// 問題のカードは、問題のしょうさい（/tutorials/1）へのリンク
		await press(student.locator('a[href="/tutorials/1"]'));

		await expect(student).toHaveURL(`${STUDENT_URL}/tutorials/1`);
		await expect(
			named(
				student,
				"heading",
				"1. <ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>もう",
			),
		).toBeVisible();
		// 迷路の3D。<Canvas>は一画面に一つ
		await expect(student.locator("canvas")).toBeVisible();
		await capture(student, testInfo, "06-児童-もんだいのしょうさい");

		await press(
			action(student, "この<ruby>迷路<rt>めいろ</rt></ruby>で<ruby>遊<rt>あそ</rt></ruby>ぶ"),
		);
		await expect(student).toHaveURL(`${STUDENT_URL}/tutorials/1/play`);
	});

	await test.step("児童: カードを4枚読み取って動かすと、ゴールに着く", async () => {
		const cards = student.getByText(
			rubyText("<ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>む"),
		);
		await expect(cards.nth(3)).toBeVisible({ timeout: 30_000 });
		await capture(student, testInfo, "07-児童-プレイ-プログラムをつくる");

		await press(named(student, "button", "ロボットを<ruby>動<rt>うご</rt></ruby>かす"));

		await expect(
			student.getByText(rubyText("ゴールに<ruby>着<rt>つ</rt></ruby>いた！")),
		).toBeVisible({ timeout: 20_000 });
		await expect(
			action(
				student,
				"<ruby>次<rt>つぎ</rt></ruby>の<ruby>問題<rt>もんだい</rt></ruby>に<ruby>進<rt>すす</rt></ruby>む",
			),
		).toBeVisible();
		await capture(student, testInfo, "08-児童-プレイ-ゴールに着いた");
	});

	await test.step("教師: 児童が送ると、進み具合がすぐ変わる", async () => {
		await expect(teacher.getByText(`チュートリアル2/${TUTORIAL_COUNT}`)).toBeVisible();
	});

	await test.step("チュートリアル2〜7を、APIから解答の例でクリアする", async () => {
		for (const { no, program } of TUTORIAL_SOLUTIONS) {
			const response = await request.post(`${API_URL}/me/tutorials/${no}/attempts`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { program },
			});
			expect(response.status(), `チュートリアル${no}`).toBe(201);
			expect(await response.json(), `チュートリアル${no}`).toMatchObject({ outcome: "goal" });
		}

		await expect(teacher.getByText("チュートリアルをすべてクリア")).toBeVisible();
		await capture(teacher, testInfo, "09-教師-進み具合-すべてクリア");
	});

	await test.step("児童: 新しい迷路を作って保存すると、しょうさいへ移る", async () => {
		await student.goto(`${STUDENT_URL}/`);
		await capture(student, testInfo, "10-児童-ホーム-すべてクリア");
		await press(
			action(
				student,
				"<ruby>新<rt>あたら</rt></ruby>しい<ruby>迷路<rt>めいろ</rt></ruby>を<ruby>作<rt>つく</rt></ruby>る",
			),
		);

		await expect(student).toHaveURL(`${STUDENT_URL}/mazes/new`);
		await student
			.getByRole("textbox", {
				name: rubyName("<ruby>迷路<rt>めいろ</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>"),
			})
			.fill(MAZE_NAME);
		await capture(student, testInfo, "11-児童-めいろをつくる");
		await press(named(student, "button", "できあがり"));

		await expect(student).toHaveURL(/\/mazes\/[0-9a-f-]{36}$/);
		await expect(student.getByRole("heading", { name: MAZE_NAME })).toBeVisible();
		await expect(
			action(student, "この<ruby>迷路<rt>めいろ</rt></ruby>で<ruby>遊<rt>あそ</rt></ruby>ぶ"),
		).toBeVisible();
		await capture(student, testInfo, "12-児童-じぶんのめいろのしょうさい");
	});

	await test.step("教師: 授業を終えると、教師はホームへ、児童は「授業がおわりました」へ移る", async () => {
		await teacher.getByRole("button", { name: "授業を終える" }).click();
		// 確認ダイアログ。押した結果が分かる言葉のボタンで確かめる
		await teacher.getByRole("dialog").getByRole("button", { name: "授業を終える" }).click();

		await expect(teacher).toHaveURL(`${TEACHER_URL}/`);
		await expect(teacher.getByText("開いている授業はありません")).toBeVisible();
		await capture(teacher, testInfo, "13-教師-ホーム-授業を終えた後");

		await expect(student).toHaveURL(`${STUDENT_URL}/ended`);
		await expect(
			student.getByText(
				rubyText("この<ruby>授業<rt>じゅぎょう</rt></ruby>は<ruby>終<rt>お</rt></ruby>わりました"),
			),
		).toBeVisible();
		await expect(
			action(
				student,
				"<ruby>新<rt>あたら</rt></ruby>しい<ruby>授業<rt>じゅぎょう</rt></ruby>に<ruby>参加<rt>さんか</rt></ruby>する",
			),
		).toBeVisible();
		await capture(student, testInfo, "14-児童-授業がおわりました");
	});

	await teacherContext.close();
});
