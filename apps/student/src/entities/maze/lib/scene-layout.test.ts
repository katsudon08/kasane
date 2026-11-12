/*
 * 迷路の3Dと2Dでマスを置く場所（仕様書domain.mdの「迷路」、README.mdの「迷路の3D」「迷路の2D」）
 * - layers[階][行][列]。0が1階、行は上から下、列は左から右
 * - xは列（左が0）、yは行（上が0）。eastはxが増える向き、southはyが増える向き
 * - 階は上に重ねて描く
 * - floorは他のマスの土台にもなる（壁の他はすべて床のタイルを敷く）
 */
import {
	DIRECTION_VECTORS,
	FLOOR,
	GOAL,
	HOLE,
	KEY,
	START,
	TELEPORT_DOWN,
	TELEPORT_UP,
	TUTORIALS,
	WALL,
} from "@kasane/core";
import type { Cell, Direction, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import {
	DIRECTION_ANGLES,
	LAYER_GAP,
	cellCenter,
	cellPositions,
	layerLabelPosition,
} from "./scene-layout";

const DIRECTIONS: Direction[] = ["north", "east", "south", "west"];

describe("cellCenter", () => {
	it.each([
		{ size: 5, position: { layer: 0, y: 0, x: 0 }, expected: [-2, 0, -2] },
		{ size: 5, position: { layer: 0, y: 2, x: 2 }, expected: [0, 0, 0] },
		{ size: 5, position: { layer: 1, y: 4, x: 4 }, expected: [2, LAYER_GAP, 2] },
		{ size: 6, position: { layer: 0, y: 0, x: 5 }, expected: [2.5, 0, -2.5] },
		{ size: 7, position: { layer: 2, y: 6, x: 0 }, expected: [-3, 2 * LAYER_GAP, 3] },
	])(
		"一辺$sizeの迷路の$positionは、迷路の中心を原点にして$expected",
		({ size, position, expected }) => {
			expect(cellCenter(size, position)).toEqual(expected);
		},
	);

	it("上の階ほど高い位置に描く", () => {
		const [, low] = cellCenter(7, { layer: 0, y: 3, x: 3 });
		const [, middle] = cellCenter(7, { layer: 1, y: 3, x: 3 });
		const [, high] = cellCenter(7, { layer: 2, y: 3, x: 3 });

		expect(low).toBeLessThan(middle);
		expect(middle).toBeLessThan(high);
	});
});

describe("DIRECTION_ANGLES", () => {
	/*
	 * ロボットのモデルは、回していないときに+xを向いている
	 * 向きの角度だけy軸まわりに回すと、その向きのDIRECTION_VECTORSで進んだ先のマスを向く
	 */
	it.each(DIRECTIONS.map((direction) => ({ direction })))(
		"$directionの角度で回したロボットは、$directionへ進んだ先のマスを向く",
		({ direction }) => {
			const angle = DIRECTION_ANGLES[direction];
			const [dx, dy] = DIRECTION_VECTORS[direction];
			const from = cellCenter(5, { layer: 0, y: 2, x: 2 });
			const to = cellCenter(5, { layer: 0, y: 2 + dy, x: 2 + dx });

			// y軸まわりにangleだけ回すと、+xは(cos, 0, -sin)になる
			expect(to[0] - from[0]).toBeCloseTo(Math.cos(angle));
			expect(to[1] - from[1]).toBeCloseTo(0);
			expect(to[2] - from[2]).toBeCloseTo(-Math.sin(angle));
		},
	);
});

describe("cellPositions", () => {
	// 8種のマスをすべて置いた2階の迷路
	const maze: Maze = {
		startDirection: "south",
		layers: [
			[
				[START, FLOOR, WALL, WALL, WALL],
				[HOLE, KEY, TELEPORT_UP, WALL, WALL],
				[WALL, WALL, WALL, WALL, WALL],
				[WALL, WALL, WALL, WALL, WALL],
				[WALL, WALL, WALL, WALL, WALL],
			],
			[
				[WALL, WALL, WALL, WALL, WALL],
				[WALL, TELEPORT_DOWN, FLOOR, WALL, WALL],
				[WALL, WALL, WALL, WALL, WALL],
				[WALL, WALL, WALL, WALL, WALL],
				[WALL, WALL, WALL, WALL, GOAL],
			],
		],
	};

	it("マスの種類ごとに、そのマスの位置を集める", () => {
		const { byCell } = cellPositions(maze);

		expect(byCell.start).toEqual([{ layer: 0, y: 0, x: 0 }]);
		expect(byCell.floor).toEqual([
			{ layer: 0, y: 0, x: 1 },
			{ layer: 1, y: 1, x: 2 },
		]);
		expect(byCell.hole).toEqual([{ layer: 0, y: 1, x: 0 }]);
		expect(byCell.key).toEqual([{ layer: 0, y: 1, x: 1 }]);
		expect(byCell.teleportUp).toEqual([{ layer: 0, y: 1, x: 2 }]);
		expect(byCell.teleportDown).toEqual([{ layer: 1, y: 1, x: 1 }]);
		expect(byCell.goal).toEqual([{ layer: 1, y: 4, x: 4 }]);
		// 1階は壁でないマスが5つ、2階は3つ
		expect(byCell.wall).toHaveLength(25 - 5 + (25 - 3));
	});

	it("壁の他のマスには、すべて床のタイルを敷く", () => {
		const { tiles } = cellPositions(maze);

		expect(tiles).toHaveLength(5 + 3);
		for (const { layer, y, x } of tiles) {
			expect(maze.layers[layer]?.[y]?.[x]).not.toBe(WALL);
		}
	});

	it.each(TUTORIALS.map((tutorial) => ({ no: tutorial.no, maze: tutorial.maze })))(
		"チュートリアル$noの、すべてのマスがどれか一つの種類に入る",
		({ maze: tutorialMaze }) => {
			const { byCell, tiles } = cellPositions(tutorialMaze);
			const cells = tutorialMaze.layers.flat(2);
			const counted = Object.values(byCell).reduce((sum, positions) => sum + positions.length, 0);

			expect(counted).toBe(cells.length);
			expect(tiles).toHaveLength(cells.filter((cell: Cell) => cell !== WALL).length);
			expect(byCell.start).toHaveLength(1);
			expect(byCell.goal).toHaveLength(1);
		},
	);
});

describe("layerLabelPosition", () => {
	it("「1F」「2F」の文字は、各階の横（迷路の外）に置く", () => {
		for (const size of [5, 6, 7]) {
			for (const layer of [0, 1, 2]) {
				const [x, y] = layerLabelPosition(size, layer);
				const [, layerY] = cellCenter(size, { layer, y: 0, x: 0 });

				expect(Math.abs(x)).toBeGreaterThan(size / 2);
				expect(y).toBeGreaterThanOrEqual(layerY);
				expect(y).toBeLessThan(layerY + LAYER_GAP);
			}
		}
	});
});
