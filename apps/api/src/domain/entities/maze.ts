/*
 * 児童が作った迷路（仕様書backend.mdの「データモデル」）
 */
import type { Maze } from "@kasane/core";

export type OwnMaze = {
	readonly mazeId: string;
	readonly name: string;
	readonly data: Maze;
	readonly updatedAt: Date;
};

// 保存する迷路の中身（名前は前後の空白を削った後の値）
export type MazeContent = {
	readonly name: string;
	readonly data: Maze;
};
