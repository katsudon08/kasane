import { describe, expect, test } from "bun:test";

import { compile } from "./compile";
import type { Cell, Maze, MazeError } from "./maze";
import { FLOOR, GOAL, START, TELEPORT_UP, WALL } from "./maze";
import type { Program } from "./program";

// 一辺5のすべてWALLの階に、[行, 列, マス]を置いた階を作る
function layerOf(placed: [number, number, Cell][]): Cell[][] {
	const layer = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => WALL));
	for (const [y, x, cell] of placed) layer[y]![x] = cell;
	return layer;
}

function mazeOf(layers: Cell[][][]): Maze {
	return { layers, startDirection: "east" };
}

const program: Program = [{ type: "forward" }];

/*
 * compileは最初にvalidateMazeを呼び、通らない迷路は呼び出し側の誤りとして例外にする
 * （確認を忘れた呼び出しで、間違った結果が正常な結果のように返るのを防ぐ）
 */
describe("compile: validateMazeを通らない迷路", () => {
	const shortRow = layerOf([
		[0, 0, START],
		[0, 1, GOAL],
	]);
	shortRow[2] = [WALL, WALL, WALL, WALL];

	test.each<[MazeError, Maze]>([
		["notSquare", mazeOf([shortRow])],
		[
			"startCount",
			mazeOf([
				layerOf([
					[0, 0, START],
					[0, 1, FLOOR],
					[0, 2, GOAL],
					[4, 4, START],
				]),
			]),
		],
		[
			"goalCount",
			mazeOf([
				layerOf([
					[0, 0, START],
					[0, 1, FLOOR],
				]),
			]),
		],
		[
			"teleportNoLayer",
			mazeOf([
				layerOf([
					[0, 0, START],
					[0, 1, TELEPORT_UP],
					[0, 2, GOAL],
				]),
			]),
		],
		[
			"teleportTargetBlocked",
			mazeOf([
				layerOf([
					[0, 0, START],
					[0, 1, TELEPORT_UP],
					[0, 2, GOAL],
				]),
				layerOf([]),
			]),
		],
	])("%sの迷路は例外になり、理由がメッセージに入る", (reason, maze) => {
		expect(() => compile(maze, program)).toThrow(reason);
	});

	test("空のプログラムでも、迷路が正しくなければ例外になる", () => {
		const maze = mazeOf([layerOf([[0, 0, START]])]);
		expect(() => compile(maze, [])).toThrow("goalCount");
	});
});
