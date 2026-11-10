-- マイグレーションを使い始める前に`drizzle-kit push`で作っていたroomsを消す（授業はlessonsで持つ）
DROP TABLE IF EXISTS "rooms";
