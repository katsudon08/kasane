/*
 * 迷路のQR（docs/specs/single/README.mdの「めいろをもらう（/mazes/import）」「じぶんのめいろのしょうさい」）
 * - 友だちの迷路のQRを偽カメラに映すと、その迷路が自分の迷路として保存され、しょうさい画面へ移る
 * - しょうさい画面の「この迷路をQRコードで見せる」で、QRと迷路の名前がモーダルに出る
 */
import { expect, test } from "@playwright/test";

import { STUDENT_URL } from "../playwright.config";
import {
	FRIEND_MAZE_NAME,
	FRIEND_MAZE_VIDEO_PATH,
	IMPORT_BUTTON,
	action,
	cameraWith,
	capture,
	closeLesson,
	joinAndClearAll,
	named,
	startLesson,
	writeFriendMazeVideo,
} from "./support/maze-qr";
import { rubyText } from "./support/ruby";

// ブラウザーを起動する前に、偽カメラに映す動画を作っておく
writeFriendMazeVideo();

test.use(cameraWith(FRIEND_MAZE_VIDEO_PATH));

test("友だちの迷路のQRを映すと自分の迷路として保存され、しょうさい画面でQRを見せられる", async ({
	page: student,
	request,
}, testInfo) => {
	// 偽カメラの動画はQRを1秒映して2秒消すくり返しなので、読み取りまで数秒かかる
	test.setTimeout(60_000);
	student.setDefaultTimeout(10_000);
	const lesson = await startLesson(request);

	await test.step("ホームの「QRコードで迷路をもらう」で、めいろをもらう画面へ移る", async () => {
		await joinAndClearAll(student, request, lesson.lessonId);
		await action(student, IMPORT_BUTTON).click();
		await expect(student).toHaveURL(`${STUDENT_URL}/mazes/import`);
		await expect(
			student.getByText(
				rubyText(
					"<ruby>友<rt>とも</rt></ruby>だちの<ruby>迷路<rt>めいろ</rt></ruby>のQRコードを<ruby>写<rt>うつ</rt></ruby>してね",
				),
			),
		).toBeVisible();
		await capture(student, testInfo, "01-児童-めいろをもらう");
	});

	await test.step("QRを読み取ると、すぐ保存して、もらった迷路のしょうさい画面へ移る", async () => {
		await expect(student).toHaveURL(/\/mazes\/[0-9a-f-]{36}$/, { timeout: 15_000 });
		await expect(student.getByRole("heading", { name: FRIEND_MAZE_NAME })).toBeVisible();
		await capture(student, testInfo, "02-児童-もらった迷路のしょうさい");
	});

	await test.step("「この迷路をQRコードで見せる」で、QRと名前がモーダルに出る", async () => {
		await action(
			student,
			"この<ruby>迷路<rt>めいろ</rt></ruby>をQRコードで<ruby>見<rt>み</rt></ruby>せる",
		).click();
		const dialog = student.getByRole("dialog");
		await expect(
			dialog.getByText(
				rubyText(
					"<ruby>友<rt>とも</rt></ruby>だちのタブレットで、このQRコードを<ruby>写<rt>うつ</rt></ruby>してもらってね",
				),
			),
		).toBeVisible();
		await expect(dialog.getByRole("img", { name: "迷路のQRコード" })).toBeVisible();
		await expect(dialog.getByText(FRIEND_MAZE_NAME)).toBeVisible();
		await capture(student, testInfo, "03-児童-迷路のQRコードを見せる");

		await named(student, "button", "<ruby>閉<rt>と</rt></ruby>じる").click();
		await expect(dialog).toBeHidden();
	});

	await test.step("ホームの自分の迷路に、もらった迷路が増えている", async () => {
		await student.goto(`${STUDENT_URL}/`);
		await expect(student.getByRole("link").filter({ hasText: FRIEND_MAZE_NAME })).toBeVisible();
	});

	await closeLesson(request, lesson);
});
