import { describe, expect, it, mock } from "bun:test";

import { roomsController } from "./rooms";

describe("roomsController", () => {
	describe("POST /rooms/create", () => {
		it("createRoomが返したRoomのidをレスポンスとして返す", async () => {
			const createRoom = mock(async () => ({ id: "room-id" }));
			const app = roomsController({ createRoom });

			const res = await app.handle(
				new Request("http://localhost/rooms/create", { method: "POST" }),
			);

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ id: "room-id" });
			expect(createRoom).toHaveBeenCalledTimes(1);
		});
	});
});
