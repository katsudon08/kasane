import type { Room } from "../entities/room";

export interface RoomRepository {
	create(): Promise<Room>;
}
