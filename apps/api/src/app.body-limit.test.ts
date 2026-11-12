/*
 * 本文の大きさの上限（仕様書backend.mdの「入力の上限」「エラーの応答」）
 * 上限はサーバーが本文を読み込む前に見るので、`app.handle()`ではなく、実際にサーバーを立てて送る
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import type { Command } from "@kasane/core";

import { createApp } from "./app";
// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する（このテストはDBを引かない）
import { db } from "./infrastructure/database/drizzle";

// 16KB
const MAX_BODY_BYTES = 16 * 1024;

const byteLength = (text: string) => new TextEncoder().encode(text).length;

const app = createApp({ db });
let origin: string;

const post = (path: string, body: string) =>
	fetch(`${origin}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body,
	});

beforeAll(() => {
	// 空いているポートで待ち受ける
	app.listen(0);
	const url = app.server?.url;
	if (!url) throw new Error("サーバーを起動できませんでした");
	origin = url.origin;
});

afterAll(async () => {
	await app.stop();
});

describe("本文の大きさの上限", () => {
	it("16KBを超える本文は、413を返す", async () => {
		// 名前が長すぎるので、読み込まれれば422になる本文
		const body = JSON.stringify({ lessonId: crypto.randomUUID(), name: "a".repeat(17_000) });
		expect(byteLength(body)).toBeGreaterThan(MAX_BODY_BYTES);

		const res = await post("/students", body);

		expect(res.status).toBe(413);
	});

	it("16KBを超える本文は、トークンが要る口でも本人の特定より先に413を返す", async () => {
		const body = JSON.stringify({ program: "a".repeat(17_000) });

		const res = await post("/me/tutorials/1/attempts", body);

		expect(res.status).toBe(413);
	});

	it("16KBに収まる本文は読み込み、中身の検証に進む", async () => {
		const body = JSON.stringify({ lessonId: crypto.randomUUID(), name: "a".repeat(15_000) });
		expect(byteLength(body)).toBeLessThan(MAX_BODY_BYTES);

		const res = await post("/students", body);

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ code: "invalidInput" });
	});

	it("仕様の上限いっぱいのプログラム（くりかえし100個）は、上限に当たらない", async () => {
		const repeat: Command = { type: "repeat", times: 10, body: [] };
		const body = JSON.stringify({ program: Array.from({ length: 100 }, () => repeat) });
		expect(byteLength(body)).toBeLessThan(MAX_BODY_BYTES / 4);

		const res = await post("/me/tutorials/1/attempts", body);

		// 本文は読み込まれて検証を通り、トークンがないので401になる
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ code: "unauthorized" });
	});

	it("仕様の上限いっぱいの迷路（3階・一辺7マス・名前20文字）は、上限に当たらない", async () => {
		const layers = Array.from({ length: 3 }, () =>
			Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => "teleportDown")),
		);
		const body = JSON.stringify({
			name: "あ".repeat(20),
			data: { layers, startDirection: "north" },
		});
		expect(byteLength(body)).toBeLessThan(MAX_BODY_BYTES / 4);

		const res = await post("/me/mazes", body);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ code: "unauthorized" });
	});
});
