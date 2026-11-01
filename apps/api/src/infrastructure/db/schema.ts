import { pgTable, uuid } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
	id: uuid().defaultRandom().primaryKey(),
});
