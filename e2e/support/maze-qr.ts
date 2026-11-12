/*
 * 迷路のQRのE2E（maze-qr-*.spec.ts）で使う手順
 * 迷路を作れるのは全問クリアした後なので、問題を飛ばすAPIで全問クリアしたことにしてからホームを開く
 * 偽カメラに映す動画はブラウザーの起動のときに決まるので、映すものごとにテストのファイルを分ける
 */
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect } from "@playwright/test";
import type { APIRequestContext, Locator, Page, TestInfo } from "@playwright/test";
import qrcode from "qrcode-generator";

import { API_URL, STUDENT_URL } from "../../playwright.config";
import { writeQrVideo } from "./fake-camera";
import { rubyName, rubyText } from "./ruby";

const TUTORIAL_COUNT = 7;

export const FRIEND_MAZE_NAME = "ともだちのめいろ";

/*
 * 友だちの迷路のQR（domain.mdの「迷路のQR（児童の端末）」の形式）
 * 5×5・1階、左上にスタート（east）、右下にゴール、2行目と4行目にかべ
 */
export const FRIEND_MAZE_QR = [
	"KASANE-MAZE",
	"1",
	"5",
	"E",
	"SFFFF" + "WWWFF" + "FFFFF" + "FFWWW" + "FFFFG",
	FRIEND_MAZE_NAME,
].join(":");

export const FRIEND_MAZE_VIDEO_PATH = join(tmpdir(), "kasane-e2e", "friend-maze.y4m");

/*
 * 友だちの迷路のQRの動画を作る。ブラウザーを起動する前に呼ぶ
 * qrcode-generatorは既定で1文字を1バイトに切り詰める（日本語の名前が壊れる）ので、UTF-8のバイト列にしてから渡す
 * 画面のQR（qrcode.react）もUTF-8で作るので、それに合わせる
 */
export function writeFriendMazeVideo(): void {
	// 他のQR（命令カード）の作り方を変えないよう、作り終えたら元に戻す
	const latin1 = Object.getOwnPropertyDescriptor(qrcode, "stringToBytes");
	if (latin1 === undefined) throw new Error("qrcode.stringToBytesがない");
	qrcode.stringToBytes = (text) => [...new TextEncoder().encode(text)];
	try {
		writeQrVideo(FRIEND_MAZE_VIDEO_PATH, FRIEND_MAZE_QR);
	} finally {
		Object.defineProperty(qrcode, "stringToBytes", latin1);
	}
}

export const IMPORT_BUTTON = "QRコードで<ruby>迷路<rt>めいろ</rt></ruby>をもらう";

// 偽カメラにvideoPathの動画を映す
export function cameraWith(videoPath: string) {
	return {
		launchOptions: {
			args: [
				"--use-fake-ui-for-media-stream",
				"--use-fake-device-for-media-stream",
				`--use-file-for-fake-video-capture=${videoPath}`,
			],
		},
	};
}

export function named(page: Page, role: "button" | "heading" | "link", spec: string): Locator {
	return page.getByRole(role, { name: rubyName(spec) }).filter({ hasText: rubyText(spec) });
}

// 押せる部品は、ボタンでもリンクでもよい（仕様書が決めているのは文言だけ）
export function action(page: Page, spec: string): Locator {
	return named(page, "button", spec).or(named(page, "link", spec));
}

export async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
	const path = testInfo.outputPath(`${name}.png`);
	await page.screenshot({ path });
	await testInfo.attach(name, { path, contentType: "image/png" });
}

function stringField(body: unknown, field: string): string {
	if (typeof body === "object" && body !== null && field in body) {
		const value: unknown = Reflect.get(body, field);
		if (typeof value === "string") return value;
	}
	throw new Error(`応答に${field}がない`);
}

export type Lesson = { lessonId: string; teacherToken: string };

export async function startLesson(request: APIRequestContext): Promise<Lesson> {
	const teacher = await request.post(`${API_URL}/teachers`);
	expect(teacher.status()).toBe(201);
	const teacherToken = stringField(await teacher.json(), "token");

	const lesson = await request.post(`${API_URL}/lessons`, {
		headers: { Authorization: `Bearer ${teacherToken}` },
	});
	expect(lesson.status()).toBe(201);
	return { lessonId: stringField(await lesson.json(), "lessonId"), teacherToken };
}

export async function closeLesson(request: APIRequestContext, lesson: Lesson): Promise<void> {
	const response = await request.post(`${API_URL}/lessons/${lesson.lessonId}/close`, {
		headers: { Authorization: `Bearer ${lesson.teacherToken}` },
	});
	expect(response.status()).toBe(204);
}

// 授業に参加し、全問クリアしたことにしてから、ホームを開く
export async function joinAndClearAll(
	student: Page,
	request: APIRequestContext,
	lessonId: string,
): Promise<void> {
	await student.goto(`${STUDENT_URL}/join?lesson=${lessonId}`);
	await student
		.getByRole("textbox", { name: rubyName("ニックネームを<ruby>入<rt>い</rt></ruby>れてね") })
		.fill("えだまめ");
	const joined = student.waitForResponse(
		(response) =>
			response.request().method() === "POST" && new URL(response.url()).pathname === "/students",
	);
	await named(
		student,
		"button",
		"この<ruby>名前<rt>なまえ</rt></ruby>で<ruby>始<rt>はじ</rt></ruby>める",
	).click();
	const response = await joined;
	expect(response.status()).toBe(201);
	const token = stringField(await response.json(), "token");

	const skipped = await request.post(`${API_URL}/me/tutorials/skip`, {
		headers: { Authorization: `Bearer ${token}` },
		data: { to: TUTORIAL_COUNT + 1 },
	});
	expect(skipped.status()).toBe(204);

	await student.goto(`${STUDENT_URL}/`);
}
