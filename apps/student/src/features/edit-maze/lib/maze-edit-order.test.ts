/*
 * 迷路の編集の、断る条件の順と下へのテレポート（仕様書domain.mdの「迷路の編集（児童の端末）」）
 * maze-edit.test.tsで見ていない組み合わせを足す
 * - placeCellは断る条件をEditErrorの順に見る
 * - テレポートの行き先を塞ぐのは壁・穴・テレポートだけ（下へのテレポートでも同じ）
 */
import { FLOOR, GOAL, KEY, START, TELEPORT_DOWN, TELEPORT_UP, validateMaze } from "@kasane/core";
import type { Cell, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { placeCell } from "./maze-edit";

// 一辺5の、すべてFLOORの階を並べ、marksのマスだけを置き換えた迷路
function mazeOf(layerMarks: { y: number; x: number; cell: Cell }[][]): Maze {
	return {
		layers: layerMarks.map((marks) => {
			const layer = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => FLOOR));
			for (const { y, x, cell } of marks) layer[y]![x] = cell;
			return layer;
		}),
		startDirection: "east",
	};
}

describe("placeCellの断る順", () => {
	it.each([TELEPORT_UP, TELEPORT_DOWN])(
		"GOALの上に%sを塗ると、テレポートの条件より先にgoalCannotBeOverwritten",
		(cell) => {
			const maze = mazeOf([[{ y: 0, x: 0, cell: START }], [{ y: 2, x: 2, cell: GOAL }], []]);

			expect(placeCell(maze, cell, { layer: 1, y: 2, x: 2 })).toEqual({
				ok: false,
				reason: "goalCannotBeOverwritten",
			});
		},
	);

	it("1階の、2階のTELEPORT_DOWNの行き先にTELEPORT_DOWNを塗ると、isTeleportTargetより先にnoLayerBelow", () => {
		const maze = mazeOf([
			[
				{ y: 0, x: 0, cell: START },
				{ y: 4, x: 4, cell: GOAL },
			],
			[{ y: 2, x: 2, cell: TELEPORT_DOWN }],
		]);

		expect(placeCell(maze, TELEPORT_DOWN, { layer: 0, y: 2, x: 2 })).toEqual({
			ok: false,
			reason: "noLayerBelow",
		});
	});
});

describe("TELEPORT_DOWNの行き先", () => {
	it.each([START, GOAL, KEY])("下の階の同じ行・列が%sでも置ける", (target) => {
		const lower =
			target === START
				? [
						{ y: 2, x: 2, cell: START },
						{ y: 4, x: 4, cell: GOAL },
					]
				: target === GOAL
					? [
							{ y: 0, x: 0, cell: START },
							{ y: 2, x: 2, cell: GOAL },
						]
					: [
							{ y: 0, x: 0, cell: START },
							{ y: 4, x: 4, cell: GOAL },
							{ y: 2, x: 2, cell: KEY },
						];
		const maze = mazeOf([lower, []]);

		const result = placeCell(maze, TELEPORT_DOWN, { layer: 1, y: 2, x: 2 });

		if (!result.ok) throw new Error(`断られた: ${result.reason}`);
		expect(result.maze.layers[1]?.[2]?.[2]).toBe(TELEPORT_DOWN);
		expect(validateMaze(result.maze)).toEqual({ ok: true });
	});
});
