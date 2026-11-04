import { describe, expect, it, mock } from "bun:test";

import type { RoomRepository } from "../../domain/repositories/room-repository";
import { createRoomUseCase } from "./create-room";

describe("createRoomUseCase", () => {
	it("リポジトリで作成したRoomを返す", async () => {
		const create = mock(async () => ({ id: "room-id" }));
		const roomRepository: RoomRepository = { create };
		const createRoom = createRoomUseCase({ roomRepository });

		const room = await createRoom();

		expect(room).toEqual({ id: "room-id" });
		expect(create).toHaveBeenCalledTimes(1);
	});
});
