/*
 * 授業が終わった後の行き先（docs/specs/single/README.mdの「画面遷移」の児童と「授業がおわりました」）
 * - 授業中に授業が終わると「授業がおわりました」へ移り、「自由に遊ぶ」で自由モードのホームへ移れる
 * - 授業が終わったと分かったら端末のトークンを捨てるので、次に開くと入口（/start）へ移る
 *   知らせ（SSEのended）で分かったときと、開いたときの応答（410）で分かったときの両方を確かめる
 * 授業は教師のAPI（POST /teachers・POST /lessons・POST /lessons/:lessonId/close）で始めて終える（backend.md）
 * 参加は、授業QRの中身のURLを直接開き、ニックネームを入れて行う（main-flow.spec.tsと同じ入り方）
 */
import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";

import { API_URL, STUDENT_URL } from "../playwright.config";
import { rubyName, rubyText } from "./support/ruby";

const NICKNAME = "えだまめ";

const ENDED = "この<ruby>授業<rt>じゅぎょう</rt></ruby>は<ruby>終<rt>お</rt></ruby>わりました";
const NEW_LESSON =
	"<ruby>新<rt>あたら</rt></ruby>しい<ruby>授業<rt>じゅぎょう</rt></ruby>に<ruby>参加<rt>さんか</rt></ruby>する";
const PLAY_FREELY = "<ruby>自由<rt>じゆう</rt></ruby>に<ruby>遊<rt>あそ</rt></ruby>ぶ";

type Lesson = { teacherToken: string; lessonId: string };

// 文言（仕様書の書き方のまま）から部品を探す。名前で探し、読み（<rt>）が文字として入っていることも条件にする
function named(page: Page, role: "button" | "link", spec: string): Locator {
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

function stringField(body: unknown, key: string): string {
	if (typeof body === "object" && body !== null && key in body) {
		const value: unknown = Reflect.get(body, key);
		if (typeof value === "string") return value;
	}
	throw new Error(`応答に${key}がない`);
}

async function startLesson(request: APIRequestContext): Promise<Lesson> {
	const teacher = await request.post(`${API_URL}/teachers`);
	expect(teacher.status()).toBe(201);
	const teacherToken = stringField(await teacher.json(), "token");

	const lesson = await request.post(`${API_URL}/lessons`, {
		headers: { Authorization: `Bearer ${teacherToken}` },
	});
	expect(lesson.status()).toBe(201);
	return { teacherToken, lessonId: stringField(await lesson.json(), "lessonId") };
}

async function closeLesson(request: APIRequestContext, { teacherToken, lessonId }: Lesson) {
	const response = await request.post(`${API_URL}/lessons/${lessonId}/close`, {
		headers: { Authorization: `Bearer ${teacherToken}` },
	});
	expect(response.status()).toBe(204);
}

async function join(page: Page, { lessonId }: Lesson): Promise<void> {
	await page.goto(`${STUDENT_URL}/join?lesson=${lessonId}`);
	await page
		.getByRole("textbox", { name: rubyName("ニックネームを<ruby>入<rt>い</rt></ruby>れてね") })
		.fill(NICKNAME);
	await press(
		named(page, "button", "この<ruby>名前<rt>なまえ</rt></ruby>で<ruby>始<rt>はじ</rt></ruby>める"),
	);
	await expect(page).toHaveURL(`${STUDENT_URL}/`);
	await expect(page.getByText(NICKNAME)).toBeVisible();
}

test("授業中に授業が終わると「授業がおわりました」へ移り、「自由に遊ぶ」で自由モードのホームへ移れる。次に開くと入口へ移る", async ({
	page,
	request,
}) => {
	const lesson = await startLesson(request);
	await join(page, lesson);

	await closeLesson(request, lesson);
	await expect(page).toHaveURL(`${STUDENT_URL}/ended`);
	await expect(page.getByText(rubyText(ENDED))).toBeVisible();
	await expect(action(page, NEW_LESSON)).toBeVisible();

	await press(action(page, PLAY_FREELY));
	await expect(page).toHaveURL(`${STUDENT_URL}/free`);

	// 知らせで授業の終わりを受け取った時点で、トークンを捨てている
	await page.goto(`${STUDENT_URL}/`);
	await expect(page).toHaveURL(`${STUDENT_URL}/start`);
});

test("画面を閉じている間に授業が終わると、次に開いたときは「授業がおわりました」へ移り、その次は入口へ移る", async ({
	page,
	request,
}) => {
	const lesson = await startLesson(request);
	await join(page, lesson);

	// 画面を離れてから授業を終える（知らせは届かない）
	await page.goto("about:blank");
	await closeLesson(request, lesson);

	await page.goto(`${STUDENT_URL}/`);
	await expect(page).toHaveURL(`${STUDENT_URL}/ended`);
	await expect(page.getByText(rubyText(ENDED))).toBeVisible();

	// 開いたときの応答（410）で授業の終わりが分かった時点で、トークンを捨てている
	await page.goto(`${STUDENT_URL}/`);
	await expect(page).toHaveURL(`${STUDENT_URL}/start`);
});
