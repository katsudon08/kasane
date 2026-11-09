import { describe, expect, test } from "bun:test";

import type { Cell, Maze } from "./maze";
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
} from "./maze";

// 一辺sizeのすべてWALLの階に、[行, 列, マス]を置いた階を作る
function layerOf(size: number, placed: [number, number, Cell][]): Cell[][] {
	const layer = Array.from({ length: size }, () => Array.from({ length: size }, () => WALL));
	for (const [y, x, cell] of placed) layer[y]![x] = cell;
	return layer;
}

function mazeOf(layers: Cell[][][]): Maze {
	return { layers, startDirection: "east" };
}

describe("validateMaze", () => {
	test("正方形で、スタートとゴールが一つずつなら通る", () => {
		const maze = mazeOf([
			layerOf(5, [
				[0, 0, START],
				[0, 1, FLOOR],
				[0, 2, GOAL],
			]),
		]);
		expect(validateMaze(maze)).toEqual({ ok: true });
	});

	describe("正方形で、すべての階が同じ大きさ", () => {
		test("行の数と列の数が違えばNOT_SQUARE", () => {
			const layer = layerOf(5, [
				[0, 0, START],
				[0, 1, GOAL],
			]);
			const maze = mazeOf([layer.slice(0, 4)]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "NOT_SQUARE" });
		});

		test("行ごとにマスの数が違えばNOT_SQUARE", () => {
			const layer = layerOf(5, [
				[0, 0, START],
				[0, 1, GOAL],
			]);
			layer[2] = [WALL, WALL, WALL, WALL];
			expect(validateMaze(mazeOf([layer]))).toEqual({ ok: false, reason: "NOT_SQUARE" });
		});

		test("階ごとに大きさが違えばNOT_SQUARE", () => {
			const maze = mazeOf([
				layerOf(5, [
					[0, 0, START],
					[0, 1, GOAL],
				]),
				layerOf(6, []),
			]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "NOT_SQUARE" });
		});
	});

	describe("startとgoalが、全階を合わせてそれぞれちょうど一つ", () => {
		test("startがなければSTART_COUNT", () => {
			const maze = mazeOf([layerOf(5, [[0, 1, GOAL]])]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "START_COUNT" });
		});

		test("startが別の階にもあればSTART_COUNT", () => {
			const maze = mazeOf([
				layerOf(5, [
					[0, 0, START],
					[0, 1, GOAL],
				]),
				layerOf(5, [[4, 4, START]]),
			]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "START_COUNT" });
		});

		test("goalがなければGOAL_COUNT", () => {
			const maze = mazeOf([layerOf(5, [[0, 0, START]])]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "GOAL_COUNT" });
		});

		test("goalが二つあればGOAL_COUNT", () => {
			const maze = mazeOf([
				layerOf(5, [
					[0, 0, START],
					[0, 1, GOAL],
					[4, 4, GOAL],
				]),
			]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "GOAL_COUNT" });
		});
	});

	describe("テレポートの行き先", () => {
		const base: [number, number, Cell][] = [
			[0, 0, START],
			[0, 1, GOAL],
		];

		test("teleportUpがいちばん上の階にあればTELEPORT_NO_LAYER", () => {
			const maze = mazeOf([layerOf(5, [...base, [2, 2, TELEPORT_UP]])]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "TELEPORT_NO_LAYER" });
		});

		test("teleportDownが1階にあればTELEPORT_NO_LAYER", () => {
			const maze = mazeOf([layerOf(5, [...base, [2, 2, TELEPORT_DOWN]]), layerOf(5, [])]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "TELEPORT_NO_LAYER" });
		});

		test.each<[string, Cell]>([
			["wall", WALL],
			["hole", HOLE],
			["teleportUp", TELEPORT_UP],
			["teleportDown", TELEPORT_DOWN],
		])("teleportUpの同じ行・列の上の階が%sならTELEPORT_TARGET_BLOCKED", (_name, target) => {
			const maze = mazeOf([
				layerOf(5, [...base, [2, 2, TELEPORT_UP]]),
				layerOf(5, [[2, 2, target]]),
				layerOf(5, []),
			]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "TELEPORT_TARGET_BLOCKED" });
		});

		test("teleportDownの同じ行・列の下の階がwallならTELEPORT_TARGET_BLOCKED", () => {
			const maze = mazeOf([layerOf(5, base), layerOf(5, [[2, 2, TELEPORT_DOWN]])]);
			expect(validateMaze(maze)).toEqual({ ok: false, reason: "TELEPORT_TARGET_BLOCKED" });
		});

		test.each<[string, Cell]>([
			["floor", FLOOR],
			["key", KEY],
		])("行き先が%sなら通る（テレポートは一方通行）", (_name, target) => {
			const maze = mazeOf([
				layerOf(5, [...base, [2, 2, TELEPORT_UP]]),
				layerOf(5, [[2, 2, target]]),
			]);
			expect(validateMaze(maze)).toEqual({ ok: true });
		});

		test("行き先がgoalでも通る", () => {
			const maze = mazeOf([
				layerOf(5, [
					[0, 0, START],
					[2, 2, TELEPORT_UP],
				]),
				layerOf(5, [[2, 2, GOAL]]),
			]);
			expect(validateMaze(maze)).toEqual({ ok: true });
		});
	});

	describe("確かめないもの", () => {
		test("ゴールまでたどり着けなくても通る", () => {
			const maze = mazeOf([
				layerOf(5, [
					[0, 0, START],
					[4, 4, GOAL],
				]),
			]);
			expect(validateMaze(maze)).toEqual({ ok: true });
		});

		test("鍵が何個あっても通る", () => {
			const maze = mazeOf([
				layerOf(5, [
					[0, 0, START],
					[0, 1, KEY],
					[0, 2, KEY],
					[0, 3, KEY],
					[0, 4, GOAL],
				]),
			]);
			expect(validateMaze(maze)).toEqual({ ok: true });
		});

		test("startDirectionが壁を向いていても通る", () => {
			const maze: Maze = {
				layers: [
					layerOf(5, [
						[0, 0, START],
						[0, 1, GOAL],
					]),
				],
				startDirection: "north",
			};
			expect(validateMaze(maze)).toEqual({ ok: true });
		});
	});
});
