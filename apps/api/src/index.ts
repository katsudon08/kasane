import { Elysia } from "elysia";

import { createRoomUseCase } from "./application/usecases/create-room";
import { db } from "./infrastructure/database/drizzle";
import { roomRepository } from "./infrastructure/repositories/room-repository";
import { roomsController } from "./presentation/controllers/rooms";

const createRoom = createRoomUseCase({ roomRepository: roomRepository(db) });

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
