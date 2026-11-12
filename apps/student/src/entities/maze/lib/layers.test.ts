/*
 * 迷路の階ごとの描き分け（仕様書README.mdの「迷路の3D」「迷路の2D」「ホーム」）
 * - 3Dは階を上に重ねて描き、上の階だけを少し透かすので、マスの位置を階ごとに分ける
 * - ホームの自分の迷路のミニマップは、プレイを始めたときにロボットがいる階（スタートの階）を描く
 */
import { FLOOR, GOAL, START, TELEPORT_DOWN, TELEPORT_UP, TUTORIALS, WALL } from "@kasane/core";
import type { Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { cellPositionsByLayer, startLayer } from "./layers";
import { cellPositions } from "./scene-layout";

const W = WALL;
const F = FLOOR;

// スタートが2階にある迷路
const startOnSecond: Maze = {
	startDirection: "west",
	layers: [
		[
			[GOAL, F, F, F, F],
			[W, W, W, W, F],
			[W, W, W, W, W],
			[W, W, W, W, W],
			[W, W, W, W, W],
		],
		[
			[W, W, W, W, TELEPORT_DOWN],
			[W, W, W, W, START],
			[W, W, W, W, W],
			[W, W, W, W, W],
			[W, W, W, W, W],
		],
	],
};

describe("startLayer", () => {
	it.each(TUTORIALS.map((tutorial) => ({ no: tutorial.no, maze: tutorial.maze })))(
		"チュートリアル$noのスタートは1階（0）",
		({ maze }) => {
			expect(startLayer(maze)).toBe(0);
		},
	);

	it("スタートが2階にあれば、1（2階）", () => {
		expect(startLayer(startOnSecond)).toBe(1);
	});

	it("スタートのない迷路は、1階（0）を描く", () => {
		const noStart: Maze = { startDirection: "east", layers: [[[F, F, F, F, GOAL]]] };

		expect(startLayer(noStart)).toBe(0);
	});
});

describe("cellPositionsByLayer", () => {
	const mazes = [
		...TUTORIALS.map((tutorial) => ({ name: `チュートリアル${tutorial.no}`, maze: tutorial.maze })),
		{ name: "スタートが2階の迷路", maze: startOnSecond },
	];

	it.each(mazes)("$nameの階の数だけ分ける", ({ maze }) => {
		expect(cellPositionsByLayer(maze)).toHaveLength(maze.layers.length);
	});

	it.each(mazes)("$nameの各階には、その階のマスだけが入る", ({ maze }) => {
		cellPositionsByLayer(maze).forEach(({ tiles, byCell }, layer) => {
			for (const position of [...tiles, ...Object.values(byCell).flat()]) {
				expect(position.layer).toBe(layer);
			}
		});
	});

	it.each(mazes)("$nameの全階を合わせると、迷路全体のマスの位置と同じになる", ({ maze }) => {
		const whole = cellPositions(maze);
		const layers = cellPositionsByLayer(maze);

		expect(layers.flatMap(({ tiles }) => tiles)).toEqual(whole.tiles);
		for (const cell of Object.keys(whole.byCell) as (keyof typeof whole.byCell)[]) {
			expect(layers.flatMap(({ byCell }) => byCell[cell])).toEqual(whole.byCell[cell]);
		}
	});

	it("テレポートは、置いた階に入る", () => {
		const [first, second] = cellPositionsByLayer({
			startDirection: "east",
			layers: [[[START, TELEPORT_UP, F, F, F]], [[W, F, F, F, GOAL]]],
		});

		expect(first?.byCell.teleportUp).toEqual([{ layer: 0, y: 0, x: 1 }]);
		expect(second?.byCell.teleportUp).toEqual([]);
	});
});
