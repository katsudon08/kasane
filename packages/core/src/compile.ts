/*
 * コンパイル（仕様書domain.mdの「コンパイル（compile）」）
 * 木構造と迷路から、ロボットが各ターンにどこにいるかを計算する。validateMazeを通った迷路を前提にする
 */

import type { Cell, Direction, Maze } from "./maze";
import {
	DIRECTION_VECTORS,
	FLOOR,
	GOAL,
	HOLE,
	KEY,
	START,
	TELEPORT_DOWN,
	TELEPORT_UP,
	WALL,
} from "./maze";
import type { Command, Program } from "./program";

// ターン数の上限。入れ子のくりかえしで長くなりすぎるのを防ぐ
export const MAX_TURNS = 200;

export type StepEvent = "move" | "turn" | "fill" | "fillMiss" | "bump" | "fall" | "goal";

export type Step = {
	// このターンの後の位置（テレポートした後の階）
	layer: number;
	// 列。左が0
	x: number;
	// 行。上が0
	y: number;
	// このターンの後の向き（その場で回るターンを描くために必要）
	direction: Direction;
	// このターンで実行した命令の、木構造の中の位置。端末はcommandIndexでカードの番号に直す
	path: number[];
	// そのターンにロボットがしたこと（3Dの動きを選ぶ）
	event: StepEvent;
	// 穴をうめたマス
	filled?: { layer: number; x: number; y: number };
	// 進んだ先がテレポートで、隣の階へ移った
	teleported?: boolean;
	// 進んだ先（テレポート後も含む）で鍵を取った
	tookKey?: boolean;
};

export type Outcome = "goal" | "bump" | "fall" | "missingKeys" | "notReached" | "tooLong";

export type CompileResult = {
	// 1ターン目から順に
	steps: Step[];
	outcome: Outcome;
};

const RIGHT_OF: Readonly<Record<Direction, Direction>> = {
	north: "east",
	east: "south",
	south: "west",
	west: "north",
};

const LEFT_OF: Readonly<Record<Direction, Direction>> = {
	north: "west",
	west: "south",
	south: "east",
	east: "north",
};

// コンパイルの中だけの状態。埋めた穴と取った鍵はlayersの複製に書き、元のmazeは書き換えない
type State = {
	layers: Cell[][][];
	layer: number;
	x: number;
	y: number;
	direction: Direction;
	keysLeft: number;
	steps: Step[];
};

function findStart(layers: Cell[][][]): { layer: number; y: number; x: number } {
	for (const [layer, rows] of layers.entries()) {
		for (const [y, row] of rows.entries()) {
			const x = row.indexOf(START);
			if (x !== -1) return { layer, y, x };
		}
	}
	throw new Error("迷路にstartのマスがない（validateMazeを通していない）");
}

function countKeys(layers: Cell[][][]): number {
	let count = 0;
	for (const rows of layers) {
		for (const row of rows) {
			for (const cell of row) {
				if (cell === KEY) count += 1;
			}
		}
	}
	return count;
}

// 迷路の外側はwallとして扱う
function cellAt(layers: Cell[][][], layer: number, y: number, x: number): Cell {
	return layers[layer]?.[y]?.[x] ?? WALL;
}

function setCell(layers: Cell[][][], layer: number, y: number, x: number, cell: Cell): void {
	const row = layers[layer]?.[y];
	if (row !== undefined) row[x] = cell;
}

function ahead(state: State): { y: number; x: number } {
	const [dx, dy] = DIRECTION_VECTORS[state.direction];
	return { y: state.y + dy, x: state.x + dx };
}

function pushStep(state: State, path: number[], event: StepEvent, extra: Partial<Step> = {}): void {
	state.steps.push({
		layer: state.layer,
		x: state.x,
		y: state.y,
		direction: state.direction,
		path,
		event,
		...extra,
	});
}

// 前にすすむ。終わりの結果になったらそれを返す
function forward(state: State, path: number[]): Outcome | undefined {
	const next = ahead(state);
	const entered = cellAt(state.layers, state.layer, next.y, next.x);
	if (entered === WALL) {
		pushStep(state, path, "bump");
		return "bump";
	}
	state.x = next.x;
	state.y = next.y;
	if (entered === HOLE) {
		pushStep(state, path, "fall");
		return "fall";
	}
	const extra: Partial<Step> = {};
	let landed = entered;
	if (entered === TELEPORT_UP || entered === TELEPORT_DOWN) {
		state.layer += entered === TELEPORT_UP ? 1 : -1;
		extra.teleported = true;
		landed = cellAt(state.layers, state.layer, state.y, state.x);
	}
	if (landed === KEY) {
		setCell(state.layers, state.layer, state.y, state.x, FLOOR);
		state.keysLeft -= 1;
		extra.tookKey = true;
	}
	if (landed === GOAL) {
		pushStep(state, path, "goal", extra);
		return state.keysLeft > 0 ? "missingKeys" : "goal";
	}
	pushStep(state, path, "move", extra);
	return undefined;
}

// 穴をうめる。先が穴でなければ何も起きず、1ターンとして数える
function fill(state: State, path: number[]): void {
	const target = ahead(state);
	if (cellAt(state.layers, state.layer, target.y, target.x) !== HOLE) {
		pushStep(state, path, "fillMiss");
		return;
	}
	setCell(state.layers, state.layer, target.y, target.x, FLOOR);
	pushStep(state, path, "fill", { filled: { layer: state.layer, x: target.x, y: target.y } });
}

function runOne(
	state: State,
	command: Exclude<Command, { type: "repeat" }>,
	path: number[],
): Outcome | undefined {
	switch (command.type) {
		case "forward":
			return forward(state, path);
		case "right":
			state.direction = RIGHT_OF[state.direction];
			pushStep(state, path, "turn");
			return undefined;
		case "left":
			state.direction = LEFT_OF[state.direction];
			pushStep(state, path, "turn");
			return undefined;
		case "fill":
			fill(state, path);
			return undefined;
	}
}

// 命令の列を順に実行する。終わりの結果になったらそれを返し、最後まで実行したらundefined
function run(state: State, commands: readonly Command[], basePath: number[]): Outcome | undefined {
	for (const [index, command] of commands.entries()) {
		const path = [...basePath, index];
		if (command.type === "repeat") {
			// くりかえす自体は1ターンを使わない
			for (let count = 0; count < command.times; count += 1) {
				const outcome = run(state, command.body, path);
				if (outcome !== undefined) return outcome;
			}
			continue;
		}
		if (state.steps.length >= MAX_TURNS) return "tooLong";
		const outcome = runOne(state, command, path);
		if (outcome !== undefined) return outcome;
	}
	return undefined;
}

export function compile(maze: Maze, program: Program): CompileResult {
	const layers = maze.layers.map((rows) => rows.map((row) => [...row]));
	const start = findStart(layers);
	const state: State = {
		layers,
		...start,
		direction: maze.startDirection,
		keysLeft: countKeys(layers),
		steps: [],
	};
	const outcome = run(state, program, []) ?? "notReached";
	return { steps: state.steps, outcome };
}
