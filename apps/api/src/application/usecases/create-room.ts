import type { Room } from "../../domain/entities/room";
import type { RoomRepository } from "../../domain/repositories/room-repository";

type CreateRoomDeps = {
	roomRepository: RoomRepository;
};

export const createRoomUseCase =
	({ roomRepository }: CreateRoomDeps) =>
	async (): Promise<Room> =>
		roomRepository.create();

export type CreateRoom = ReturnType<typeof createRoomUseCase>;
