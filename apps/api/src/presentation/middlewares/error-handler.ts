import { Elysia } from "elysia";

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
	{ as: "global" },
	({ code, error, status }) => {
		// throwされたstatus()はそのまま通す
		if (typeof code === "number") return;

		switch (code) {
			// Elysiaが返す4xxのエラーはそのまま通す
			case "VALIDATION":
			case "PARSE":
			case "NOT_FOUND":
			case "INVALID_COOKIE_SIGNATURE":
			case "INVALID_FILE_TYPE":
				return;

			default:
				console.error(error);
				return status(500, {
					code: "INTERNAL_SERVER_ERROR",
					message: "サーバーでエラーが発生しました",
				});
		}
	},
);
