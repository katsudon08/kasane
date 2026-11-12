/*
 * 入力の検証に落ちたときの応答（仕様書backend.mdの「エラーの応答」）
 */
import { afterEach, beforeEach, describe, expect, it, type Mock, spyOn } from "bun:test";

import { Elysia, t } from "elysia";

import { errorHandler } from "./error-handler";

const routes = new Elysia()
	.post("/items/:id", ({ body }) => body, {
		params: t.Object({ id: t.String({ format: "uuid" }) }),
		body: t.Object({ secret: t.String({ maxLength: 5 }) }),
	})
	// 応答スキーマに合わない値を返す、サーバー側の誤りを起こす
	.get("/broken-response", () => ({ value: "not a number" }) as unknown as { value: number }, {
		response: t.Object({ value: t.Number() }),
	});

const app = new Elysia().use(errorHandler).use(routes);

const post = (path: string, body: unknown) =>
	app.handle(
		new Request(`http://localhost${path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);

describe("errorHandler（入力の検証）", () => {
	// テストの出力を汚さないようにログ出力を差し替える
	let consoleError: Mock<typeof console.error>;

	beforeEach(() => {
		consoleError = spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleError.mockRestore();
	});

	it("本文が検証に落ちたら、422とコードだけを返し、送られた値や検証の詳細を含めない", async () => {
		const res = await post(`/items/${crypto.randomUUID()}`, { secret: "too long secret" });
		const text = await res.text();

		expect(res.status).toBe(422);
		expect(JSON.parse(text)).toEqual({ code: "invalidInput" });
		expect(text).not.toContain("too long secret");
	});

	it("パスの値が検証に落ちても、422とコードだけを返す", async () => {
		const res = await post("/items/not-a-uuid", { secret: "ok" });

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ code: "invalidInput" });
	});

	it("応答が応答スキーマに合わないのは入力の誤りではないので、500を返し、ログに出力する", async () => {
		const res = await app.handle(new Request("http://localhost/broken-response"));
		const text = await res.text();

		expect(res.status).toBe(500);
		expect(text).not.toContain("not a number");
		expect(consoleError).toHaveBeenCalled();
	});
});
