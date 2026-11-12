/*
 * 迷路のQRでないものを映す（docs/specs/single/README.mdの「めいろをもらう（/mazes/import）」の読み取れないときの文言）
 * 命令カード（FORWARD）のQRを偽カメラに映すと、保存せず、カメラの下に理由の文言を出す
 */
import { expect, test } from "@playwright/test";

import { STUDENT_URL } from "../playwright.config";
import { FORWARD_VIDEO_PATH } from "./support/fake-camera";
import {
	IMPORT_BUTTON,
	action,
	cameraWith,
	capture,
	closeLesson,
	joinAndClearAll,
	startLesson,
} from "./support/maze-qr";
import { rubyText } from "./support/ruby";

test.use(cameraWith(FORWARD_VIDEO_PATH));

test("命令カードのQRを映すと、保存せず、迷路のQRコードではないと出す", async ({
	page: student,
	request,
}, testInfo) => {
	test.setTimeout(60_000);
	student.setDefaultTimeout(10_000);
	const lesson = await startLesson(request);

	await joinAndClearAll(student, request, lesson.lessonId);
	await action(student, IMPORT_BUTTON).click();
	await expect(student).toHaveURL(`${STUDENT_URL}/mazes/import`);

	await expect(
		student.getByRole("alert").filter({
			hasText: rubyText(
				"これは<ruby>迷路<rt>めいろ</rt></ruby>のQRコードではないよ。<ruby>友<rt>とも</rt></ruby>だちの<ruby>迷路<rt>めいろ</rt></ruby>のQRコードを<ruby>写<rt>うつ</rt></ruby>してね",
			),
		}),
	).toBeVisible({ timeout: 15_000 });
	await capture(student, testInfo, "04-児童-めいろをもらう-迷路のQRでない");
	await expect(student).toHaveURL(`${STUDENT_URL}/mazes/import`);

	await closeLesson(request, lesson);
});
