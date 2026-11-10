import { Elysia } from "elysia";

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
	{ as: "global" },
	({ code, error, set, status }) => {
		// throwされたstatus()はそのまま通す
		if (typeof code === "number") return;

		switch (code) {
			case "VALIDATION":
				// 応答が応答スキーマに合わないのは入力の誤りではなく、サーバーの誤り
				if (error.type === "response") break;
				// 入力の検証に落ちたら、コードだけを返す（送られた値や検証の詳細を返さない）
				// 検証は本人の特定（macro）より先に走るので、認証が必要な口の応答としてここでもキャッシュさせない
				set.headers["cache-control"] = "no-store";
				return status(422, { code: "invalidInput" });

			// Elysiaが返す4xxのエラーはそのまま通す
			case "PARSE":
			case "NOT_FOUND":
			case "INVALID_COOKIE_SIGNATURE":
			case "INVALID_FILE_TYPE":
				return;
		}

		console.error(error);
		return status(500, {
			code: "INTERNAL_SERVER_ERROR",
			message: "サーバーでエラーが発生しました",
		});
	},
);
