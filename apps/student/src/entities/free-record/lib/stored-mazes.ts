/*
 * 自由モードの自分の迷路（仕様書free-mode.mdの「記録」）
 * localStorageには、迷路の配列をJSONで保存する。要素はGET /me/mazesの要素にcreatedAtを足した形
 * 読み出すときは一つずつ確かめ、形（backend.mdの「入力の上限」と同じ範囲）かvalidateMazeを通らないものは出さない
 */
import {
	FLOOR,
	GOAL,
	HOLE,
	KEY,
	START,
	TELEPORT_DOWN,
	TELEPORT_UP,
	WALL,
	validateMaze,
} from "@kasane/core";
import type { Direction, Maze } from "@kasane/core";
import * as z from "zod";

import { nameOf } from "../../../shared/lib/name";
import { parseStored } from "./parse-stored";

export type FreeMaze = {
	mazeId: string;
	name: string;
	data: Maze;
	// どちらも末尾がZのISO 8601の文字列。updatedAtは一覧の並びに使う
	createdAt: string;
	updatedAt: string;
};

const CELLS = [FLOOR, WALL, HOLE, START, GOAL, TELEPORT_UP, TELEPORT_DOWN, KEY] as const;
const DIRECTIONS = ["north", "east", "south", "west"] as const satisfies readonly Direction[];

// 1〜3階、各階は5〜7行、各行は5〜7マス。正方形かどうかと迷路のルールはvalidateMazeで見る
const mazeSchema = z.object({
	layers: z
		.array(
			z
				.array(z.array(z.enum(CELLS)).min(5).max(7))
				.min(5)
				.max(7),
		)
		.min(1)
		.max(3),
	startDirection: z.enum(DIRECTIONS),
});

const storedMazeSchema = z.object({
	mazeId: z.uuid(),
	// 前後の空白を削って1〜20文字、改行と制御文字なし（迷路の名前と同じ決まり）
	name: z.string().refine((name) => nameOf(name) !== null),
	data: mazeSchema,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

const entriesSchema = z.array(z.unknown());

export function readMazes(stored: string | null): FreeMaze[] {
	const entries = entriesSchema.safeParse(parseStored(stored));
	if (!entries.success) return [];

	const mazes = entries.data.flatMap((entry) => {
		const maze = storedMazeSchema.safeParse(entry);
		if (!maze.success || !validateMaze(maze.data.data).ok) return [];
		return [maze.data];
	});
	return sortMazes(mazes);
}

function compareIds(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

// updatedAtが新しい順、同じならmazeId順（GET /me/mazesと同じ）。元の配列は変えない
export function sortMazes(mazes: readonly FreeMaze[]): FreeMaze[] {
	return [...mazes].sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || compareIds(a.mazeId, b.mazeId),
	);
}
