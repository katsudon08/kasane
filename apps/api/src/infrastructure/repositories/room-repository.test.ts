import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import { eq } from "drizzle-orm";

// pnpm testではdotenvで.env.test.localが読み込まれるため、テスト用DBに接続する
import { db } from "../database/drizzle";
import { rooms } from "../database/schema";
import { roomRepository } from "./room-repository";

// バージョンの指定はしない
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("roomRepository", () => {
	beforeEach(async () => {
		await db.delete(rooms);
	});

	afterAll(async () => {
		await db.$client.end();
	});

	describe("create", () => {
		it("roomsテーブルに行を追加し、DBで採番されたidを含むRoomを返す", async () => {
			const room = await roomRepository(db).create();

			expect(room.id).toMatch(UUID_PATTERN);

			const rows = await db.select().from(rooms).where(eq(rooms.id, room.id));
			expect(rows).toHaveLength(1);
		});

		it("呼び出すたびに別のidで行を追加する", async () => {
			const repository = roomRepository(db);

			const first = await repository.create();
			const second = await repository.create();

			expect(first.id).not.toBe(second.id);

			const rows = await db.select().from(rooms);
			expect(rows).toHaveLength(2);
		});
	});
});
