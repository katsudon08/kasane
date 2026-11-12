/*
 * マスをタップしたときの割り当て（仕様書domain.mdの「迷路の編集（児童の端末）」の画面側の割り当て）
 * 選んでいる道具がSTARTで、タップしたマスがSTARTならrotateStart。それ以外のタップはplaceCell
 */
import { FLOOR, GOAL, START, WALL } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { createMaze, placeCell } from "./maze-edit";
import { tapCell } from "./tap-cell";

describe("tapCell", () => {
	it("STARTの道具でSTARTのマスをタップすると、ロボットの向きを右回りに変える", () => {
		const maze = createMaze(5);

		const result = tapCell(maze, START, { layer: 0, y: 0, x: 0 });

		expect(result).toEqual({ ok: true, maze: { ...maze, startDirection: "south" } });
	});

	it("STARTの道具で別のマスをタップすると、スタートを動かす", () => {
		const maze = createMaze(5);

		const result = tapCell(maze, START, { layer: 0, y: 2, x: 2 });

		expect(result).toEqual(placeCell(maze, START, { layer: 0, y: 2, x: 2 }));
		expect(result.ok && result.maze.layers[0]?.[0]?.[0]).toBe(FLOOR);
	});

	it("STARTのマスを別の道具でタップすると、placeCellの理由を返す", () => {
		const maze = createMaze(5);

		expect(tapCell(maze, WALL, { layer: 0, y: 0, x: 0 })).toEqual({
			ok: false,
			reason: "startCannotBeOverwritten",
		});
	});

	it("GOALの道具でGOALのマスをタップしても、向きは変えない", () => {
		const maze = createMaze(5);

		const result = tapCell(maze, GOAL, { layer: 0, y: 4, x: 4 });

		expect(result).toEqual({ ok: true, maze });
	});
});
