/*
 * プレイ画面で、あるターンの状態を求める（仕様書README.mdの「ロボットを動かす」）
 * - 「前にもどる」は、stepsから求めたそのターンの状態（位置・向き・埋めた穴・取った鍵）に戻す
 * - fill: 前の穴が床に変わる（埋めた後は元からの床と同じ見た目）。tookKey: 鍵が上がって消える
 * - fall: 穴に落ちて見えなくなる
 * 端末は自分ではcompileし直さず、サーバーから届いたstepsをなぞる（domain.mdの「コンパイル」）
 * テストでは、届くstepsの代わりにpackages/coreのcompileで作る
 */
import { FLOOR, GOAL, HOLE, KEY, START, TUTORIALS, WALL, compile } from "@kasane/core";
import type { Command, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { boardAt, robotAt } from "./run-playback";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const fill: Command = { type: "fill" };

function tutorialMaze(no: number): Maze {
	const tutorial = TUTORIALS[no - 1];
	if (tutorial === undefined) throw new Error(`チュートリアル${no}がない`);
	return tutorial.maze;
}

const W = WALL;
const F = FLOOR;

// 穴を埋めてから進み、鍵を取ってゴールする迷路
const MAZE: Maze = {
	startDirection: "east",
	layers: [
		[
			[START, HOLE, F, KEY, GOAL],
			[W, W, W, W, W],
			[W, W, W, W, W],
			[W, W, W, W, W],
			[W, W, W, W, W],
		],
	],
};

describe("robotAt", () => {
	it("0ターン目は、スタートのマスにstartDirectionの向きで立つ", () => {
		const maze = tutorialMaze(3);

		expect(robotAt(maze, [], 0)).toEqual({
			layer: 0,
			x: 0,
			y: 5,
			direction: "east",
			visible: true,
		});
	});

	it("nターン目は、n個目のstepの後の位置と向き", () => {
		const maze = tutorialMaze(2);
		const { steps } = compile(maze, [forward, forward, right, forward]);

		expect(robotAt(maze, steps, 2)).toEqual({
			layer: 0,
			x: 2,
			y: 0,
			direction: "east",
			visible: true,
		});
		expect(robotAt(maze, steps, 3)).toEqual({
			layer: 0,
			x: 2,
			y: 0,
			direction: "south",
			visible: true,
		});
		expect(robotAt(maze, steps, 4)).toEqual({
			layer: 0,
			x: 2,
			y: 1,
			direction: "south",
			visible: true,
		});
	});

	it("テレポートした後は、隣の階にいる", () => {
		const maze = tutorialMaze(5);
		const { steps } = compile(maze, [
			{ type: "repeat", times: 3, body: [forward] },
			right,
			{ type: "repeat", times: 3, body: [forward] },
		]);

		expect(robotAt(maze, steps, steps.length)).toEqual({
			layer: 1,
			x: 3,
			y: 3,
			direction: "south",
			visible: true,
		});
	});

	it("穴に落ちた後は見えない", () => {
		const { steps } = compile(MAZE, [forward]);

		expect(robotAt(MAZE, steps, 1)).toEqual({
			layer: 0,
			x: 1,
			y: 0,
			direction: "east",
			visible: false,
		});
	});

	it("ターンがstepsの外なら、呼び出し側の誤りとして例外にする", () => {
		expect(() => robotAt(MAZE, [], 1)).toThrow();
		expect(() => robotAt(MAZE, [], -1)).toThrow();
	});
});

describe("boardAt", () => {
	const { steps } = compile(MAZE, [fill, forward, forward, forward, forward]);

	it("何も起きていないターンは、元の迷路をそのまま返す", () => {
		expect(boardAt(MAZE, steps, 0)).toBe(MAZE);
	});

	it("穴をうめたターンの後は、その穴が床になる", () => {
		const board = boardAt(MAZE, steps, 1);

		expect(board.layers[0]?.[0]).toEqual([START, F, F, KEY, GOAL]);
	});

	it("鍵を取ったターンの後は、その鍵が床になる", () => {
		const board = boardAt(MAZE, steps, 4);

		expect(board.layers[0]?.[0]).toEqual([START, F, F, F, GOAL]);
	});

	it("鍵を取るターンを動かしている間は、その鍵を迷路から外す（鍵は上がって消える動きで別に描く）", () => {
		expect(boardAt(MAZE, steps, 3).layers[0]?.[0]).toEqual([START, F, F, KEY, GOAL]);
		expect(boardAt(MAZE, steps, 3, true).layers[0]?.[0]).toEqual([START, F, F, F, GOAL]);
	});

	it("穴をうめるターンを動かしている間は、まだ穴のまま（光る球が大きくなった後に床に変わる）", () => {
		expect(boardAt(MAZE, steps, 0, true).layers[0]?.[0]).toEqual([START, HOLE, F, KEY, GOAL]);
	});

	it("「前にもどる」で前のターンにすると、埋めた穴と取った鍵が元に戻る", () => {
		expect(boardAt(MAZE, steps, 0)).toEqual(MAZE);
		expect(boardAt(MAZE, steps, 3).layers[0]?.[0]).toEqual([START, F, F, KEY, GOAL]);
	});

	it("テレポートした先の鍵を取ったら、隣の階の鍵が床になる", () => {
		const maze = tutorialMaze(6);
		const solution: Command[] = [
			forward,
			{ type: "repeat", times: 5, body: [right, forward, { type: "left" }, forward] },
		];
		const result = compile(maze, solution);
		const keyTurn = result.steps.findIndex((step) => step.tookKey === true);

		expect(boardAt(maze, result.steps, keyTurn).layers[1]?.[3]?.[4]).toBe(KEY);
		expect(boardAt(maze, result.steps, keyTurn + 1).layers[1]?.[3]?.[4]).toBe(F);
		expect(boardAt(maze, result.steps, keyTurn + 1).layers[0]).toBe(maze.layers[0]);
	});

	it("元の迷路を書き換えない", () => {
		const before = structuredClone(MAZE);

		boardAt(MAZE, steps, steps.length);

		expect(MAZE).toEqual(before);
	});

	it("ターンがstepsの外なら、呼び出し側の誤りとして例外にする", () => {
		expect(() => boardAt(MAZE, steps, steps.length + 1)).toThrow();
	});
});
