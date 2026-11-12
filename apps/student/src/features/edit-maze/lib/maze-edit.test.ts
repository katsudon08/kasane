/*
 * 迷路の編集（仕様書domain.mdの「迷路の編集（児童の端末）」）
 * - ok: trueで返ったMazeが、すべての操作でvalidateMazeを通ること
 * - 断る条件ごとに、EditErrorの順でreasonが返ること
 * - 元のMazeを書き換えず、変える階と行だけを複製し、残りは元の配列を共有すること
 * - 範囲外のPositionのような呼び出し側の誤りだけ例外にすること
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
import type { Cell, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { addLayer, createMaze, placeCell, removeTopLayer, rotateStart } from "./maze-edit";
import type { EditResult } from "./maze-edit";

// 一辺sizeの、すべてFLOORの階
function floorLayer(size: number): Cell[][] {
	return Array.from({ length: size }, () => Array.from({ length: size }, () => FLOOR));
}

// 階を並べた迷路。各階はmarksのマスだけをFLOOR以外にする
function mazeOf(
	layerMarks: { y: number; x: number; cell: Cell }[][],
	size = 5,
	startDirection: Maze["startDirection"] = "east",
): Maze {
	return {
		layers: layerMarks.map((marks) => {
			const layer = floorLayer(size);
			for (const { y, x, cell } of marks) {
				const row = layer[y];
				if (row === undefined) throw new Error(`範囲外の行: ${y}`);
				row[x] = cell;
			}
			return layer;
		}),
		startDirection,
	};
}

// createMazeと同じ形（左上にSTART、右下にGOAL）の1階
const START_GOAL = [
	{ y: 0, x: 0, cell: START },
	{ y: 4, x: 4, cell: GOAL },
];

// ok: trueで、validateMazeを通るMazeを取り出す
function validMaze(result: EditResult): Maze {
	if (!result.ok) throw new Error(`断られた: ${result.reason}`);
	expect(validateMaze(result.maze)).toEqual({ ok: true });
	return result.maze;
}

function cellAt(maze: Maze, layer: number, y: number, x: number): Cell | undefined {
	return maze.layers[layer]?.[y]?.[x];
}

describe("createMaze", () => {
	it.each([5, 6, 7] as const)(
		"%iでは、1階・すべてFLOOR・左上にSTART・右下にGOAL・eastの迷路を作る",
		(size) => {
			const maze = createMaze(size);

			const expected = floorLayer(size);
			expected[0]![0] = START;
			expected[size - 1]![size - 1] = GOAL;
			expect(maze).toEqual({ layers: [expected], startDirection: "east" });
			expect(validateMaze(maze)).toEqual({ ok: true });
		},
	);
});

describe("placeCell", () => {
	describe("通ったらcellを置く", () => {
		it.each([FLOOR, WALL, HOLE, KEY])("%sを床に置く", (cell) => {
			const maze = mazeOf([START_GOAL]);

			const placed = validMaze(placeCell(maze, cell, { layer: 0, y: 2, x: 3 }));

			expect(cellAt(placed, 0, 2, 3)).toBe(cell);
		});

		it("KEYは何個でも置ける", () => {
			const maze = mazeOf([[...START_GOAL, { y: 1, x: 1, cell: KEY }]]);

			const placed = validMaze(placeCell(maze, KEY, { layer: 0, y: 2, x: 2 }));

			expect(cellAt(placed, 0, 1, 1)).toBe(KEY);
			expect(cellAt(placed, 0, 2, 2)).toBe(KEY);
		});

		it("上の階があれば、行き先が床のTELEPORT_UPを置ける", () => {
			const maze = mazeOf([START_GOAL, []]);

			const placed = validMaze(placeCell(maze, TELEPORT_UP, { layer: 0, y: 2, x: 2 }));

			expect(cellAt(placed, 0, 2, 2)).toBe(TELEPORT_UP);
		});

		it("下の階があれば、行き先が床のTELEPORT_DOWNを置ける", () => {
			const maze = mazeOf([START_GOAL, []]);

			const placed = validMaze(placeCell(maze, TELEPORT_DOWN, { layer: 1, y: 2, x: 2 }));

			expect(cellAt(placed, 1, 2, 2)).toBe(TELEPORT_DOWN);
		});

		it.each([START, GOAL, KEY])(
			"テレポートの行き先が%sでも置ける（行き先を塞ぐのは壁・穴・テレポートだけ）",
			(target) => {
				const marks =
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
							: [...START_GOAL, { y: 2, x: 2, cell: KEY }];
				const maze = mazeOf([[], marks]);

				const placed = validMaze(placeCell(maze, TELEPORT_UP, { layer: 0, y: 2, x: 2 }));

				expect(cellAt(placed, 0, 2, 2)).toBe(TELEPORT_UP);
			},
		);

		it("テレポートの上にFLOORを置くと、テレポートが消える", () => {
			const maze = mazeOf([[...START_GOAL, { y: 2, x: 2, cell: TELEPORT_UP }], []]);

			const placed = validMaze(placeCell(maze, FLOOR, { layer: 0, y: 2, x: 2 }));

			expect(cellAt(placed, 0, 2, 2)).toBe(FLOOR);
		});
	});

	describe("置くのがSTARTかGOALなら、前の場所をFLOORに戻す", () => {
		it("STARTを同じ階の別のマスに動かす", () => {
			const maze = mazeOf([START_GOAL]);

			const placed = validMaze(placeCell(maze, START, { layer: 0, y: 2, x: 1 }));

			expect(cellAt(placed, 0, 0, 0)).toBe(FLOOR);
			expect(cellAt(placed, 0, 2, 1)).toBe(START);
		});

		it("GOALを同じ行の別のマスに動かす", () => {
			const maze = mazeOf([START_GOAL]);

			const placed = validMaze(placeCell(maze, GOAL, { layer: 0, y: 4, x: 1 }));

			expect(cellAt(placed, 0, 4, 4)).toBe(FLOOR);
			expect(cellAt(placed, 0, 4, 1)).toBe(GOAL);
		});

		it("STARTを別の階に動かす", () => {
			const maze = mazeOf([START_GOAL, []]);

			const placed = validMaze(placeCell(maze, START, { layer: 1, y: 3, x: 3 }));

			expect(cellAt(placed, 0, 0, 0)).toBe(FLOOR);
			expect(cellAt(placed, 1, 3, 3)).toBe(START);
		});

		it("GOALを別の階に動かす", () => {
			const maze = mazeOf([START_GOAL, []]);

			const placed = validMaze(placeCell(maze, GOAL, { layer: 1, y: 0, x: 4 }));

			expect(cellAt(placed, 0, 4, 4)).toBe(FLOOR);
			expect(cellAt(placed, 1, 0, 4)).toBe(GOAL);
		});

		it("STARTを鍵の上に置くと、鍵は消える", () => {
			const maze = mazeOf([[...START_GOAL, { y: 2, x: 2, cell: KEY }]]);

			const placed = validMaze(placeCell(maze, START, { layer: 0, y: 2, x: 2 }));

			expect(cellAt(placed, 0, 2, 2)).toBe(START);
			expect(cellAt(placed, 0, 0, 0)).toBe(FLOOR);
		});

		it("STARTのマスにSTARTを置いても、迷路は変わらない", () => {
			const maze = mazeOf([START_GOAL]);

			const placed = validMaze(placeCell(maze, START, { layer: 0, y: 0, x: 0 }));

			expect(placed).toEqual(maze);
		});

		it("GOALのマスにGOALを置いても、迷路は変わらない", () => {
			const maze = mazeOf([START_GOAL]);

			const placed = validMaze(placeCell(maze, GOAL, { layer: 0, y: 4, x: 4 }));

			expect(placed).toEqual(maze);
		});
	});

	describe("断る条件", () => {
		it.each([FLOOR, WALL, HOLE, GOAL, TELEPORT_UP, KEY])(
			"STARTの上に%sを塗ろうとしたらstartCannotBeOverwritten",
			(cell) => {
				const maze = mazeOf([START_GOAL, []]);

				expect(placeCell(maze, cell, { layer: 0, y: 0, x: 0 })).toEqual({
					ok: false,
					reason: "startCannotBeOverwritten",
				});
			},
		);

		it.each([FLOOR, WALL, HOLE, START, TELEPORT_DOWN, KEY])(
			"GOALの上に%sを塗ろうとしたらgoalCannotBeOverwritten",
			(cell) => {
				const maze = mazeOf([[{ y: 0, x: 0, cell: START }], [{ y: 4, x: 4, cell: GOAL }]]);

				expect(placeCell(maze, cell, { layer: 1, y: 4, x: 4 })).toEqual({
					ok: false,
					reason: "goalCannotBeOverwritten",
				});
			},
		);

		it("1階だけの迷路にTELEPORT_UPを置こうとしたらnoLayerAbove", () => {
			const maze = mazeOf([START_GOAL]);

			expect(placeCell(maze, TELEPORT_UP, { layer: 0, y: 2, x: 2 })).toEqual({
				ok: false,
				reason: "noLayerAbove",
			});
		});

		it("最上階にTELEPORT_UPを置こうとしたらnoLayerAbove", () => {
			const maze = mazeOf([START_GOAL, [], []]);

			expect(placeCell(maze, TELEPORT_UP, { layer: 2, y: 2, x: 2 })).toEqual({
				ok: false,
				reason: "noLayerAbove",
			});
		});

		it("1階にTELEPORT_DOWNを置こうとしたらnoLayerBelow", () => {
			const maze = mazeOf([START_GOAL, []]);

			expect(placeCell(maze, TELEPORT_DOWN, { layer: 0, y: 2, x: 2 })).toEqual({
				ok: false,
				reason: "noLayerBelow",
			});
		});

		it.each([WALL, HOLE, TELEPORT_UP, TELEPORT_DOWN])(
			"TELEPORT_UPの行き先（上の階の同じ行・列）が%sならteleportTargetBlocked",
			(target) => {
				const maze = mazeOf([START_GOAL, [{ y: 2, x: 2, cell: target }], []]);

				expect(placeCell(maze, TELEPORT_UP, { layer: 0, y: 2, x: 2 })).toEqual({
					ok: false,
					reason: "teleportTargetBlocked",
				});
			},
		);

		it.each([WALL, HOLE, TELEPORT_UP, TELEPORT_DOWN])(
			"TELEPORT_DOWNの行き先（下の階の同じ行・列）が%sならteleportTargetBlocked",
			(target) => {
				const maze = mazeOf([[], [{ y: 2, x: 2, cell: target }], START_GOAL]);

				expect(placeCell(maze, TELEPORT_DOWN, { layer: 2, y: 2, x: 2 })).toEqual({
					ok: false,
					reason: "teleportTargetBlocked",
				});
			},
		);

		it.each([WALL, HOLE, TELEPORT_UP, TELEPORT_DOWN])(
			"下の階のTELEPORT_UPの行き先に%sを塗ろうとしたらisTeleportTarget",
			(cell) => {
				const maze = mazeOf([[...START_GOAL, { y: 2, x: 2, cell: TELEPORT_UP }], [], []]);

				expect(placeCell(maze, cell, { layer: 1, y: 2, x: 2 })).toEqual({
					ok: false,
					reason: cell === TELEPORT_DOWN ? "teleportTargetBlocked" : "isTeleportTarget",
				});
			},
		);

		it.each([WALL, HOLE, TELEPORT_UP, TELEPORT_DOWN])(
			"上の階のTELEPORT_DOWNの行き先に%sを塗ろうとしたらisTeleportTarget",
			(cell) => {
				const maze = mazeOf([[], [], [...START_GOAL, { y: 2, x: 2, cell: TELEPORT_DOWN }]]);

				expect(placeCell(maze, cell, { layer: 1, y: 2, x: 2 })).toEqual({
					ok: false,
					reason: cell === TELEPORT_UP ? "teleportTargetBlocked" : "isTeleportTarget",
				});
			},
		);

		it.each([FLOOR, KEY, START, GOAL])("テレポートの行き先でも、%sは置ける", (cell) => {
			const maze = mazeOf([
				[
					{ y: 0, x: 0, cell: START },
					{ y: 1, x: 1, cell: GOAL },
					{ y: 2, x: 2, cell: TELEPORT_UP },
				],
				[],
			]);

			const placed = validMaze(placeCell(maze, cell, { layer: 1, y: 2, x: 2 }));

			expect(cellAt(placed, 1, 2, 2)).toBe(cell);
		});

		it("断る条件はEditErrorの順に見る（STARTの上に、行き先のないTELEPORT_UPを塗るとstartCannotBeOverwritten）", () => {
			const maze = mazeOf([START_GOAL]);

			expect(placeCell(maze, TELEPORT_UP, { layer: 0, y: 0, x: 0 })).toEqual({
				ok: false,
				reason: "startCannotBeOverwritten",
			});
		});

		it("断る条件はEditErrorの順に見る（最上階で、行き先にもなっているマスにTELEPORT_UPを塗るとnoLayerAbove）", () => {
			const maze = mazeOf([[...START_GOAL, { y: 2, x: 2, cell: TELEPORT_UP }], []]);

			expect(placeCell(maze, TELEPORT_UP, { layer: 1, y: 2, x: 2 })).toEqual({
				ok: false,
				reason: "noLayerAbove",
			});
		});
	});

	describe("元の迷路を書き換えず、変える階と行だけを複製する", () => {
		it("同じ階の別の行と、別の階は、元の配列を共有する", () => {
			const maze = mazeOf([START_GOAL, []]);
			const before = structuredClone(maze);

			const placed = validMaze(placeCell(maze, WALL, { layer: 0, y: 2, x: 2 }));

			expect(maze).toEqual(before);
			expect(placed.layers).not.toBe(maze.layers);
			expect(placed.layers[0]).not.toBe(maze.layers[0]);
			expect(placed.layers[0]?.[2]).not.toBe(maze.layers[0]?.[2]);
			expect(placed.layers[0]?.[1]).toBe(maze.layers[0]?.[1]);
			expect(placed.layers[1]).toBe(maze.layers[1]);
		});

		it("STARTを動かすと、前の場所の行と新しい場所の行だけを複製する", () => {
			const maze = mazeOf([START_GOAL, []]);
			const before = structuredClone(maze);

			const placed = validMaze(placeCell(maze, START, { layer: 1, y: 3, x: 3 }));

			expect(maze).toEqual(before);
			expect(placed.layers[0]?.[0]).not.toBe(maze.layers[0]?.[0]);
			expect(placed.layers[0]?.[4]).toBe(maze.layers[0]?.[4]);
			expect(placed.layers[1]?.[3]).not.toBe(maze.layers[1]?.[3]);
			expect(placed.layers[1]?.[0]).toBe(maze.layers[1]?.[0]);
		});

		it("断ったときも、元の迷路を書き換えない", () => {
			const maze = mazeOf([START_GOAL]);
			const before = structuredClone(maze);

			placeCell(maze, WALL, { layer: 0, y: 0, x: 0 });

			expect(maze).toEqual(before);
		});
	});

	describe("範囲外のPositionは呼び出し側の誤りなので例外にする", () => {
		it.each([
			{ layer: 1, y: 0, x: 0 },
			{ layer: -1, y: 0, x: 0 },
			{ layer: 0, y: 5, x: 0 },
			{ layer: 0, y: 0, x: 5 },
			{ layer: 0, y: -1, x: 0 },
		])("$layer階$y行$x列", (at) => {
			const maze = mazeOf([START_GOAL]);

			expect(() => placeCell(maze, WALL, at)).toThrow();
		});
	});
});

describe("rotateStart", () => {
	it.each([
		{ from: "east", to: "south" },
		{ from: "south", to: "west" },
		{ from: "west", to: "north" },
		{ from: "north", to: "east" },
	] as const)("$fromを$toに進める", ({ from, to }) => {
		const maze = mazeOf([START_GOAL], 5, from);

		const rotated = rotateStart(maze);

		expect(rotated.startDirection).toBe(to);
		expect(rotated.layers).toBe(maze.layers);
		expect(maze.startDirection).toBe(from);
		expect(validateMaze(rotated)).toEqual({ ok: true });
	});
});

describe("addLayer", () => {
	it("すべてFLOORの階を、いちばん上に足す", () => {
		const maze = mazeOf([START_GOAL], 6);

		const added = validMaze(addLayer(maze));

		expect(added.layers).toHaveLength(2);
		expect(added.layers[1]).toEqual(floorLayer(6));
		expect(added.layers[0]).toBe(maze.layers[0]);
		expect(maze.layers).toHaveLength(1);
	});

	it("2階の迷路に、3階を足す", () => {
		const maze = mazeOf([START_GOAL, []]);

		const added = validMaze(addLayer(maze));

		expect(added.layers).toHaveLength(3);
		expect(added.layers[2]).toEqual(floorLayer(5));
	});

	it("3階なら断る（maxLayers）", () => {
		const maze = mazeOf([START_GOAL, [], []]);

		expect(addLayer(maze)).toEqual({ ok: false, reason: "maxLayers" });
	});
});

describe("removeTopLayer", () => {
	it("いちばん上の階を外す", () => {
		const maze = mazeOf([START_GOAL, [{ y: 1, x: 1, cell: WALL }]]);

		const removed = validMaze(removeTopLayer(maze));

		expect(removed.layers).toHaveLength(1);
		expect(removed.layers[0]).toBe(maze.layers[0]);
		expect(maze.layers).toHaveLength(2);
	});

	it("いちばん上の階のTELEPORT_DOWNは、階と一緒に消える", () => {
		const maze = mazeOf([START_GOAL, [{ y: 2, x: 2, cell: TELEPORT_DOWN }]]);

		const removed = validMaze(removeTopLayer(maze));

		expect(removed.layers).toHaveLength(1);
	});

	it("1階なら断る（minLayers）", () => {
		const maze = mazeOf([START_GOAL]);

		expect(removeTopLayer(maze)).toEqual({ ok: false, reason: "minLayers" });
	});

	it("いちばん上にSTARTがあれば断る（layerHasStartOrGoal）", () => {
		const maze = mazeOf([[{ y: 4, x: 4, cell: GOAL }], [{ y: 0, x: 0, cell: START }]]);

		expect(removeTopLayer(maze)).toEqual({ ok: false, reason: "layerHasStartOrGoal" });
	});

	it("いちばん上にGOALがあれば断る（layerHasStartOrGoal）", () => {
		const maze = mazeOf([[{ y: 0, x: 0, cell: START }], [], [{ y: 4, x: 4, cell: GOAL }]]);

		expect(removeTopLayer(maze)).toEqual({ ok: false, reason: "layerHasStartOrGoal" });
	});

	it("一つ下の階にTELEPORT_UPがあれば断る（layerIsTeleportTarget）", () => {
		const maze = mazeOf([START_GOAL, [{ y: 2, x: 2, cell: TELEPORT_UP }], []]);

		expect(removeTopLayer(maze)).toEqual({ ok: false, reason: "layerIsTeleportTarget" });
	});

	it("二つ下の階のTELEPORT_UPは、いちばん上の階を行き先にしないので断らない", () => {
		const maze = mazeOf([[...START_GOAL, { y: 2, x: 2, cell: TELEPORT_UP }], [], []]);

		const removed = validMaze(removeTopLayer(maze));

		expect(removed.layers).toHaveLength(2);
	});

	it("断る条件は表の順に見る（STARTのある階の下にTELEPORT_UPがあればlayerHasStartOrGoal）", () => {
		const maze = mazeOf([
			[
				{ y: 4, x: 4, cell: GOAL },
				{ y: 2, x: 2, cell: TELEPORT_UP },
			],
			[{ y: 0, x: 0, cell: START }],
		]);

		expect(removeTopLayer(maze)).toEqual({ ok: false, reason: "layerHasStartOrGoal" });
	});
});
