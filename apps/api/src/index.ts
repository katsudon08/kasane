import { Elysia } from "elysia";

export const app = new Elysia()
	.get("/", () => "Hello Elysia")
	.get("/health", () => "OK")
	.ws("/ws", {
		message(ws, message) {
			ws.send(message);
		},
	})
	.listen(3000);

export type App = typeof app;

console.log(`@kasane/api : ${app.server?.url.href}`);
