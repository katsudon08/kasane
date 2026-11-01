import { Elysia } from "elysia";

import { roomsController } from "./presentation/controllers/rooms";

// TODO: ユースケース実装後に差し替える
const createRoom = async () => ({ id: "dummy-room-id" });

export const app = new Elysia()
	.use(roomsController({ createRoom }))
	.get("/health", () => "OK")
	.ws("/ws", {
		message(ws, message) {
			ws.send(message);
		},
	})
	.listen(3000);

export type App = typeof app;

console.log(`@kasane/api : ${app.server?.url.href}`);
