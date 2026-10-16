import { Elysia } from "elysia";

const app = new Elysia()
	.get("/", () => "Hello Elysia")
	.get("/health", () => "OK")
	.ws("/ws", {
		message(ws, message) {
			ws.send(message);
		},
	})
	.listen(3000);

console.log(`@kasane/api : ${app.server?.url.href}`);
