import { cors } from "@elysia/cors";
import { Elysia } from "elysia";

import { env } from "./config/env";
import { errorHandler } from "./presentation/middlewares/error-handler";

export const app = new Elysia()
	// 教師アプリと児童アプリの二つのオリジンだけを許可する
	.use(cors({ origin: [env.TEACHER_ORIGIN, env.STUDENT_ORIGIN] }))
	.use(errorHandler)
	.get("/health", () => "OK")
	.ws("/ws", {
		message(ws, message) {
			ws.send(message);
		},
	})
	.listen(3000);

export type App = typeof app;

console.log(`@kasane/api : ${app.server?.url.href}`);
