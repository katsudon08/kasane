import { cors } from "@elysia/cors";
import { Elysia } from "elysia";

import { createRoomUseCase } from "./application/usecases/create-room";
import { env } from "./config/env";
import { db } from "./infrastructure/database/drizzle";
import { roomRepository } from "./infrastructure/repositories/room-repository";
import { roomsController } from "./presentation/controllers/rooms";
import { errorHandler } from "./presentation/middlewares/error-handler";

const createRoom = createRoomUseCase({ roomRepository: roomRepository(db) });

export const app = new Elysia()
	.use(cors({ origin: env.TEACHER_ORIGIN }))
	.use(errorHandler)
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
