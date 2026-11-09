import { describe, expect, test } from "bun:test";

import type { Step } from "./compile";
import { MAX_TURNS, compile } from "./compile";
import type { Cell, Maze } from "./maze";
import { FLOOR, GOAL, HOLE, KEY, START, TELEPORT_DOWN, TELEPORT_UP, WALL } from "./maze";
import type { Command, Program } from "./program";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const left: Command = { type: "left" };
const fill: Command = { type: "fill" };

function repeat(times: number, body: Command[]): Command {
	return { type: "repeat", times, body };
}

function times(count: number, command: Command): Command[] {
	return Array.from({ length: count }, () => command);
}

const W = WALL;
const WALLS: Cell[] = [W, W, W, W, W];

// 一辺5のすべてWALLの階に、[行, 列, マス]を置いた階を作る
function layerOf(placed: [number, number, Cell][]): Cell[][] {
	const layer = Array.from({ length: 5 }, () => [...WALLS]);
	for (const [y, x, cell] of placed) layer[y]![x] = cell;
	return layer;
}

// 1行目がSTART, FLOOR, FLOOR, FLOOR, GOALの1階の迷路（チュートリアル1と同じ形）
function corridor(): Maze {
	return {
		layers: [[[START, FLOOR, FLOOR, FLOOR, GOAL], WALLS, WALLS, WALLS, WALLS]],
		startDirection: "east",
	};
}

function lastStep(steps: Step[]): Step {
	const step = steps.at(-1);
	if (step === undefined) throw new Error("stepsが空");
	return step;
}

describe("compile", () => {
	describe("マスにロボットが入ると", () => {
		test("floor: 進める", () => {
			const { steps, outcome } = compile(corridor(), [forward]);
			expect(steps).toEqual([
				{ layer: 0, x: 1, y: 0, direction: "east", path: [0], event: "move" },
			]);
			expect(outcome).toBe("notReached");
		});

		test("wall: ぶつかって止まる（失敗）。位置は変わらず、残りの命令は実行しない", () => {
			const maze: Maze = { ...corridor(), startDirection: "south" };
			const { steps, outcome } = compile(maze, [forward, forward]);
			expect(steps).toEqual([
				{ layer: 0, x: 0, y: 0, direction: "south", path: [0], event: "bump" },
			]);
			expect(outcome).toBe("bump");
		});

		test("迷路の外はwallとして扱う", () => {
			const maze: Maze = { ...corridor(), startDirection: "west" };
			const { steps, outcome } = compile(maze, [forward]);
			expect(steps).toEqual([
				{ layer: 0, x: 0, y: 0, direction: "west", path: [0], event: "bump" },
			]);
			expect(outcome).toBe("bump");
		});

		test("hole: 進んで落ちる（失敗）。残りの命令は実行しない", () => {
			const maze: Maze = {
				layers: [[[START, HOLE, FLOOR, FLOOR, GOAL], WALLS, WALLS, WALLS, WALLS]],
				startDirection: "east",
			};
			const { steps, outcome } = compile(maze, [forward, forward]);
			expect(steps).toEqual([
				{ layer: 0, x: 1, y: 0, direction: "east", path: [0], event: "fall" },
			]);
			expect(outcome).toBe("fall");
		});

		test("start: 床と同じ", () => {
			const { steps, outcome } = compile(corridor(), [forward, right, right, forward]);
			expect(lastStep(steps)).toEqual({
				layer: 0,
				x: 0,
				y: 0,
				direction: "west",
				path: [3],
				event: "move",
			});
			expect(outcome).toBe("notReached");
		});

		test("goal: 鍵をすべて取っていればクリア。残りの命令は実行しない", () => {
			const { steps, outcome } = compile(corridor(), [...times(4, forward), forward]);
			expect(steps).toHaveLength(4);
			expect(lastStep(steps)).toEqual({
				layer: 0,
				x: 4,
				y: 0,
				direction: "east",
				path: [3],
				event: "goal",
			});
			expect(outcome).toBe("goal");
		});

		test("goal: 鍵が残っていれば失敗（missingKeys）。最後のStepのeventはgoalのまま、残りの命令は実行しない", () => {
			const maze: Maze = {
				layers: [[[START, FLOOR, GOAL, FLOOR, KEY], WALLS, WALLS, WALLS, WALLS]],
				startDirection: "east",
			};
			const { steps, outcome } = compile(maze, [forward, forward, forward]);
			expect(steps).toHaveLength(2);
			expect(lastStep(steps)).toEqual({
				layer: 0,
				x: 2,
				y: 0,
				direction: "east",
				path: [1],
				event: "goal",
			});
			expect(outcome).toBe("missingKeys");
		});

		test("鍵が残ったままゴールを通り抜けることはできない", () => {
			const maze: Maze = {
				layers: [[[START, GOAL, KEY, FLOOR, FLOOR], WALLS, WALLS, WALLS, WALLS]],
				startDirection: "east",
			};
			const { outcome } = compile(maze, [forward, forward, left, left, forward, forward]);
			expect(outcome).toBe("missingKeys");
		});

		test("teleportUp: 同じ行・列の一つ上の階へ移る", () => {
			const maze: Maze = {
				layers: [
					layerOf([
						[0, 0, START],
						[0, 1, TELEPORT_UP],
					]),
					layerOf([
						[0, 1, FLOOR],
						[0, 2, GOAL],
					]),
				],
				startDirection: "east",
			};
			const { steps, outcome } = compile(maze, [forward, forward]);
			expect(steps).toEqual([
				{ layer: 1, x: 1, y: 0, direction: "east", path: [0], event: "move", teleported: true },
				{ layer: 1, x: 2, y: 0, direction: "east", path: [1], event: "goal" },
			]);
			expect(outcome).toBe("goal");
		});

		test("teleportDown: 同じ行・列の一つ下の階へ移る", () => {
			const maze: Maze = {
				layers: [
					layerOf([
						[0, 1, FLOOR],
						[0, 2, GOAL],
					]),
					layerOf([
						[0, 0, START],
						[0, 1, TELEPORT_DOWN],
					]),
				],
				startDirection: "east",
			};
			const { steps, outcome } = compile(maze, [forward, forward]);
			expect(steps).toEqual([
				{ layer: 0, x: 1, y: 0, direction: "east", path: [0], event: "move", teleported: true },
				{ layer: 0, x: 2, y: 0, direction: "east", path: [1], event: "goal" },
			]);
			expect(outcome).toBe("goal");
		});

		test("テレポートで移った先が鍵なら取る", () => {
			const maze: Maze = {
				layers: [
					layerOf([
						[0, 0, START],
						[0, 1, TELEPORT_UP],
					]),
					layerOf([
						[0, 1, KEY],
						[0, 2, GOAL],
					]),
				],
				startDirection: "east",
			};
			const { steps, outcome } = compile(maze, [forward, forward]);
			expect(steps[0]).toEqual({
				layer: 1,
				x: 1,
				y: 0,
				direction: "east",
				path: [0],
				event: "move",
				teleported: true,
				tookKey: true,
			});
			expect(outcome).toBe("goal");
		});

		test("テレポートで移った先がgoalならgoal", () => {
			const maze: Maze = {
				layers: [
					layerOf([
						[0, 0, START],
						[0, 1, TELEPORT_UP],
					]),
					layerOf([[0, 1, GOAL]]),
				],
				startDirection: "east",
			};
			const { steps, outcome } = compile(maze, [forward]);
			expect(steps).toEqual([
				{ layer: 1, x: 1, y: 0, direction: "east", path: [0], event: "goal", teleported: true },
			]);
			expect(outcome).toBe("goal");
		});

		test("key: 鍵を取る（止まらない）。そのマスはコンパイルの中だけでfloorになる", () => {
			const maze: Maze = {
				layers: [[[START, KEY, FLOOR, FLOOR, GOAL], WALLS, WALLS, WALLS, WALLS]],
				startDirection: "east",
			};
			// 鍵を取り、戻ってもう一度同じマスを踏み、ゴールへ
			const program: Program = [forward, left, left, forward, right, right, ...times(5, forward)];
			const { steps, outcome } = compile(maze, program);
			expect(steps[0]).toEqual({
				layer: 0,
				x: 1,
				y: 0,
				direction: "east",
				path: [0],
				event: "move",
				tookKey: true,
			});
			// 7番目（path [6]）でもう一度鍵のマスに入るが、もう鍵はない
			expect(steps[6]).toEqual({
				layer: 0,
				x: 1,
				y: 0,
				direction: "east",
				path: [6],
				event: "move",
			});
			expect(outcome).toBe("goal");
			expect(maze.layers[0]![0]![1]).toBe(KEY);
		});

		test("鍵が0個の迷路では、ゴールに着けばそのままgoal", () => {
			expect(compile(corridor(), times(4, forward)).outcome).toBe("goal");
		});

		test("鍵が2個なら両方取るまでmissingKeys", () => {
			const maze: Maze = {
				layers: [[[START, KEY, KEY, FLOOR, GOAL], WALLS, WALLS, WALLS, WALLS]],
				startDirection: "east",
			};
			expect(compile(maze, times(4, forward)).outcome).toBe("goal");
			const oneKey: Maze = {
				layers: [[[START, FLOOR, KEY, GOAL, KEY], WALLS, WALLS, WALLS, WALLS]],
				startDirection: "east",
			};
			expect(compile(oneKey, times(3, forward)).outcome).toBe("missingKeys");
		});
	});

	describe("1ターンの動き", () => {
		test("右にまがる: その場で右に90度向きを変える（進まない）", () => {
			const { steps } = compile(corridor(), [right, right, right, right]);
			expect(steps.map((step) => step.direction)).toEqual(["south", "west", "north", "east"]);
			expect(steps.map((step) => step.event)).toEqual(["turn", "turn", "turn", "turn"]);
			expect(steps.every((step) => step.x === 0 && step.y === 0 && step.layer === 0)).toBe(true);
		});

		test("左にまがる: その場で左に90度向きを変える（進まない）", () => {
			const { steps } = compile(corridor(), [left, left, left, left]);
			expect(steps.map((step) => step.direction)).toEqual(["north", "west", "south", "east"]);
			expect(steps.map((step) => step.event)).toEqual(["turn", "turn", "turn", "turn"]);
		});

		test("穴をうめる: 向いている方向の同じ階の1マス先がholeならfloorにする（fill）", () => {
			const maze: Maze = {
				layers: [[[START, HOLE, FLOOR, FLOOR, GOAL], WALLS, WALLS, WALLS, WALLS]],
				startDirection: "east",
			};
			const { steps, outcome } = compile(maze, [fill, ...times(4, forward)]);
			expect(steps[0]).toEqual({
				layer: 0,
				x: 0,
				y: 0,
				direction: "east",
				path: [0],
				event: "fill",
				filled: { layer: 0, x: 1, y: 0 },
			});
			expect(steps[1]).toEqual({
				layer: 0,
				x: 1,
				y: 0,
				direction: "east",
				path: [1],
				event: "move",
			});
			expect(outcome).toBe("goal");
			// compileは元のmazeを書き換えない
			expect(maze.layers[0]![0]![1]).toBe(HOLE);
		});

		test.each<[string, Maze]>([
			["床", corridor()],
			[
				"壁",
				{
					layers: [[[START, WALL, FLOOR, FLOOR, GOAL], WALLS, WALLS, WALLS, WALLS]],
					startDirection: "east",
				},
			],
			["迷路の外", { ...corridor(), startDirection: "west" }],
		])(
			"穴をうめる: 先が%sなら何も起きず次へ進む（fillMiss。1ターンとして数える）",
			(_name, maze) => {
				const { steps, outcome } = compile(maze, [fill, right]);
				expect(steps).toHaveLength(2);
				expect(steps[0]).toEqual({
					layer: 0,
					x: 0,
					y: 0,
					direction: maze.startDirection,
					path: [0],
					event: "fillMiss",
				});
				expect(steps[1]?.event).toBe("turn");
				expect(outcome).toBe("notReached");
			},
		);

		test("くりかえす: bodyの命令をtimes回くりかえす。くりかえす自体は1ターンを使わない", () => {
			const { steps, outcome } = compile(corridor(), [repeat(4, [forward])]);
			expect(steps.map((step) => step.path)).toEqual([
				[0, 0],
				[0, 0],
				[0, 0],
				[0, 0],
			]);
			expect(steps.map((step) => step.x)).toEqual([1, 2, 3, 4]);
			expect(outcome).toBe("goal");
		});

		test("入れ子のくりかえしのpathは木構造の中の位置", () => {
			const { steps } = compile(corridor(), [right, repeat(2, [repeat(2, [left]), right])]);
			expect(steps.map((step) => step.path)).toEqual([
				[0],
				[1, 0, 0],
				[1, 0, 0],
				[1, 1],
				[1, 0, 0],
				[1, 0, 0],
				[1, 1],
			]);
		});
	});

	describe("成功・失敗の判定", () => {
		test("ターンが200を超えたらtooLong（失敗）", () => {
			const program: Program = [repeat(10, [repeat(10, [repeat(10, [right])])])];
			const { steps, outcome } = compile(corridor(), program);
			expect(MAX_TURNS).toBe(200);
			expect(steps).toHaveLength(200);
			expect(outcome).toBe("tooLong");
		});

		test("ちょうど200ターンで命令が終わればtooLongではない", () => {
			const program: Program = [repeat(10, [repeat(10, [right, left])])];
			const { steps, outcome } = compile(corridor(), program);
			expect(steps).toHaveLength(200);
			expect(outcome).toBe("notReached");
		});

		test("200ターン目にゴールに着けばgoal", () => {
			// 196ターンその場で回ってから、4マス進む
			const program: Program = [
				repeat(7, [repeat(7, [right, left, right, left])]),
				...times(4, forward),
			];
			const { steps, outcome } = compile(corridor(), program);
			expect(steps).toHaveLength(200);
			expect(outcome).toBe("goal");
		});

		test("最後の命令まで実行してもゴールにいなければnotReached（失敗）", () => {
			const { steps, outcome } = compile(corridor(), times(3, forward));
			expect(steps).toHaveLength(3);
			expect(outcome).toBe("notReached");
		});

		test("空のプログラムはnotReached", () => {
			expect(compile(corridor(), [])).toEqual({ steps: [], outcome: "notReached" });
		});

		test("失敗した命令はstepsの最後の要素のpathで分かる", () => {
			const { steps, outcome } = compile(corridor(), [
				forward,
				repeat(2, [forward, left]),
				forward,
			]);
			expect(outcome).toBe("bump");
			expect(lastStep(steps).path).toEqual([1, 0]);
		});

		test("始まりの位置はstartのマス、向きはstartDirection", () => {
			const maze: Maze = {
				layers: [
					layerOf([
						[3, 2, START],
						[2, 2, FLOOR],
						[1, 2, GOAL],
					]),
				],
				startDirection: "north",
			};
			const { steps, outcome } = compile(maze, [forward, forward]);
			expect(steps[0]).toEqual({
				layer: 0,
				x: 2,
				y: 2,
				direction: "north",
				path: [0],
				event: "move",
			});
			expect(outcome).toBe("goal");
		});

		test("startが2階にあっても始まりはそのマス", () => {
			const maze: Maze = {
				layers: [
					layerOf([]),
					layerOf([
						[0, 0, START],
						[0, 1, GOAL],
					]),
				],
				startDirection: "east",
			};
			const { steps } = compile(maze, [forward]);
			expect(steps[0]?.layer).toBe(1);
		});

		test("startのない迷路は呼び出し側の誤りなので例外", () => {
			const maze: Maze = { layers: [layerOf([[0, 1, GOAL]])], startDirection: "east" };
			expect(() => compile(maze, [forward])).toThrow();
		});
	});
});
