import { Elysia } from "elysia";

export const app = new Elysia()
	.get("/", () => "Hello Elysia")
	.get("/health", () => "OK")
	.ws("/ws", {
		message(ws, message) {
			ws.send(message);
		},
	});

// Eden Treaty がクライアント側の型を推論するために使う型。packages/lib-client から import type される
export type App = typeof app;
