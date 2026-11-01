import { Elysia } from "elysia";

import { createRoomUseCase } from "./application/usecases/create-room";
import type { RoomRepository } from "./domain/repositories/room-repository";
import { roomsController } from "./presentation/controllers/rooms";

// TODO: infrastructure の DrizzleRoomRepository 実装後に差し替える
const roomRepository: RoomRepository = {
	create: async () => ({ id: "dummy-room-id" }),
};

const createRoom = createRoomUseCase({ roomRepository });

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
