import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { Room } from "../../domain/entities/room";
import type { RoomRepository } from "../../domain/repositories/room-repository";
import { rooms } from "../database/schema";

export const roomRepository = (db: NodePgDatabase): RoomRepository => ({
	async create(): Promise<Room> {
		const [room] = await db.insert(rooms).values({}).returning({ id: rooms.id });

		if (!room) {
			throw new Error("rooms テーブルへの INSERT で行が返されませんでした");
		}

		return { id: room.id };
	},
});
