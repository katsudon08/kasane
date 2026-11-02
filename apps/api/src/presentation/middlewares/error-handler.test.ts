import { afterEach, beforeEach, describe, expect, it, type Mock, spyOn } from "bun:test";

import { Elysia, InvalidCookieSignature, InvalidFileType, status, t } from "elysia";

import { errorHandler } from "./error-handler";

const INTERNAL_SERVER_ERROR_BODY = {
	code: "INTERNAL_SERVER_ERROR",
	message: "サーバーでエラーが発生しました",
};

class ErrorWithCode extends Error {
	code = "ECONNREFUSED";
}

class ErrorWithStatus extends Error {
	status = 404;
}

// index.tsのcontrollerと同じく、errorHandlerとは別のインスタンスにルートを定義する
const routes = new Elysia()
	.post("/thrown-status/4xx", () => {
		throw status(409, "conflict");
	})
	.post("/thrown-status/5xx", () => {
		throw status(503, "maintenance");
	})
	.post("/validation", ({ body }) => body, {
		body: t.Object({ value: t.Number() }),
	})
	// Cookieの署名やファイルの種類の検証を実際に起こすのは大がかりなためElysiaのエラーを直接throwする
	.post("/invalid-cookie-signature", () => {
		throw new InvalidCookieSignature("session");
	})
	.post("/invalid-file-type", () => {
		throw new InvalidFileType("file", "image/png");
	})
	.post("/error", () => {
		throw new Error("internal detail");
	})
	.post("/error-with-code", () => {
		throw new ErrorWithCode("connect ECONNREFUSED 10.0.0.1:5432");
	})
	.post("/error-with-status", () => {
		throw new ErrorWithStatus("external api detail");
	});

const app = new Elysia().use(errorHandler).use(routes);

const post = (path: string, body?: string) =>
	app.handle(
		new Request(`http://localhost${path}`, {
			method: "POST",
			headers: body === undefined ? undefined : { "content-type": "application/json" },
			body,
		}),
	);

describe("errorHandler", () => {
	// テストの出力を汚さないようにログ出力を差し替える
	let consoleError: Mock<typeof console.error>;

	beforeEach(() => {
		consoleError = spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleError.mockRestore();
	});

	describe("throwされたstatus()", () => {
		it("4xxのステータスと本文をそのまま返す", async () => {
			const res = await post("/thrown-status/4xx");

			expect(res.status).toBe(409);
			expect(await res.text()).toBe("conflict");
		});

		it("5xxのステータスと本文も、汎用的な500に書き換えずにそのまま返す", async () => {
			const res = await post("/thrown-status/5xx");

			expect(res.status).toBe(503);
			expect(await res.text()).toBe("maintenance");
		});
	});

	describe("Elysiaが返す4xxのエラー", () => {
		// テスト名の$codeの直後に日本語を書くとオブジェクトが展開されないためコロンで区切る
		it.each([
			{
				code: "VALIDATION",
				path: "/validation",
				body: JSON.stringify({ value: "not a number" }),
				expected: 422,
			},
			{ code: "PARSE", path: "/validation", body: '{"value":', expected: 400 },
			{ code: "NOT_FOUND", path: "/not-found", body: undefined, expected: 404 },
			{
				code: "INVALID_COOKIE_SIGNATURE",
				path: "/invalid-cookie-signature",
				body: undefined,
				expected: 400,
			},
			{ code: "INVALID_FILE_TYPE", path: "/invalid-file-type", body: undefined, expected: 422 },
		])("$code: Elysiaのデフォルトのステータスで返す", async ({ path, body, expected }) => {
			const res = await post(path, body);

			expect(res.status).toBe(expected);
		});
	});

	describe("それ以外のエラー", () => {
		it("Errorは500と決まった本文を返し、詳細を含めず、ログに出力する", async () => {
			const res = await post("/error");
			const text = await res.text();

			expect(res.status).toBe(500);
			expect(text).not.toContain("internal detail");
			expect(JSON.parse(text)).toEqual(INTERNAL_SERVER_ERROR_BODY);
			expect(consoleError).toHaveBeenCalled();
		});

		it("codeプロパティを持つエラー（pgのエラーなど）も500にする", async () => {
			const res = await post("/error-with-code");
			const text = await res.text();

			expect(res.status).toBe(500);
			expect(text).not.toContain("ECONNREFUSED");
			expect(JSON.parse(text)).toEqual(INTERNAL_SERVER_ERROR_BODY);
		});

		it("statusプロパティを持つエラー（外部APIのライブラリなど）も、そのステータスを使わずに500にする", async () => {
			const res = await post("/error-with-status");
			const text = await res.text();

			expect(res.status).toBe(500);
			expect(text).not.toContain("external api detail");
			expect(JSON.parse(text)).toEqual(INTERNAL_SERVER_ERROR_BODY);
		});
	});
});
