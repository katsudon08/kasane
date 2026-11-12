import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { MazeRepository } from "../../domain/repositories/maze-repository";
import { mazes } from "../database/schema";

const mazeColumns = {
	mazeId: mazes.id,
	name: mazes.name,
	data: mazes.data,
	updatedAt: mazes.updatedAt,
};

// 迷路のIDと本人（児童）のIDの両方で絞る。取得してからアプリ側で比較する書き方はしない
const ownMaze = (mazeId: string, studentId: string) =>
	and(eq(mazes.id, mazeId), eq(mazes.studentId, studentId));

export const mazeRepository = (db: NodePgDatabase): MazeRepository => ({
	async findByStudent(studentId) {
		return db
			.select(mazeColumns)
			.from(mazes)
			.where(eq(mazes.studentId, studentId))
			.orderBy(desc(mazes.updatedAt), asc(mazes.id));
	},

	async findByIdAndStudent(mazeId, studentId) {
		const [maze] = await db.select(mazeColumns).from(mazes).where(ownMaze(mazeId, studentId));

		return maze ?? null;
	},

	async create(studentId, content) {
		const [created] = await db
			.insert(mazes)
			.values({ studentId, ...content })
			.returning({ mazeId: mazes.id });
		if (!created) throw new Error("迷路の行が返されませんでした");

		return created.mazeId;
	},

	async replace(mazeId, studentId, content) {
		// 作成時のcreatedAt・updatedAtと同じく、DBの時計で今の時刻にする
		const replaced = await db
			.update(mazes)
			.set({ ...content, updatedAt: sql`now()` })
			.where(ownMaze(mazeId, studentId))
			.returning({ mazeId: mazes.id });

		return replaced.length > 0;
	},

	// その迷路への挑戦の記録は、外部キーのon delete cascadeで一緒に消える
	async delete(mazeId, studentId) {
		const deleted = await db
			.delete(mazes)
			.where(ownMaze(mazeId, studentId))
			.returning({ mazeId: mazes.id });

		return deleted.length > 0;
	},
});
