/*
 * 迷路のQR（仕様書domain.mdの「迷路のQR（児童の端末）」）
 * 中身は「KASANE-MAZE:1:一辺:向き:マス:名前」。マスは1マス1文字で、1階の1行目の左から右、2行目…、続けて2階、3階
 * タブレットの画面を別のタブレットで読める粗さのQRにするため、JSONは使わない
 */
import { validateMaze } from "@kasane/core";
import type { Cell, Direction, Maze } from "@kasane/core";

import { nameOf } from "../../../shared/lib/name";

export type DecodeMazeQrResult =
	| { ok: true; name: string; maze: Maze }
	// notMazeQr: カードや授業のQRなど、迷路のQRでない。brokenMaze: 迷路のQRだが、中身が迷路のルールに合わない
	| { ok: false; reason: "notMazeQr" | "brokenMaze" };

const PREFIX = "KASANE-MAZE:1:";
const SEPARATOR = ":";

const MIN_SIZE = 5;
const MAX_SIZE = 7;
const MAX_LAYERS = 3;

const CELL_LETTERS: Readonly<Record<Cell, string>> = {
	floor: "F",
	wall: "W",
	hole: "H",
	start: "S",
	goal: "G",
	teleportUp: "U",
	teleportDown: "D",
	key: "K",
};

const DIRECTION_LETTERS: Readonly<Record<Direction, string>> = {
	north: "N",
	east: "E",
	south: "S",
	west: "W",
};

function invert<T extends string>(letters: Readonly<Record<T, string>>): ReadonlyMap<string, T> {
	return new Map(
		Object.entries<string>(letters).map(([value, letter]): [string, T] => [letter, value as T]),
	);
}

const CELLS_BY_LETTER = invert(CELL_LETTERS);
const DIRECTIONS_BY_LETTER = invert(DIRECTION_LETTERS);

// mazeは保存済み（validateMazeを通る）ものだけを渡す
export function encodeMazeQr(name: string, maze: Maze): string {
	const size = maze.layers[0]?.length ?? 0;
	const cells = maze.layers
		.flatMap((layer) => layer.flatMap((row) => row.map((cell) => CELL_LETTERS[cell])))
		.join("");
	return [`${PREFIX}${size}`, DIRECTION_LETTERS[maze.startDirection], cells, name].join(SEPARATOR);
}

const BROKEN: DecodeMazeQrResult = { ok: false, reason: "brokenMaze" };

function parseSize(text: string): number | null {
	if (!/^\d$/.test(text)) return null;
	const size = Number(text);
	return size >= MIN_SIZE && size <= MAX_SIZE ? size : null;
}

// 1マス1文字の並びを、階・行・列に分ける。表にない文字があるか、長さが一辺×一辺の1〜3倍でなければnull
function parseLayers(text: string, size: number): Cell[][][] | null {
	const area = size * size;
	const layerCount = text.length / area;
	if (!Number.isInteger(layerCount) || layerCount < 1 || layerCount > MAX_LAYERS) return null;

	const cells: Cell[] = [];
	for (const letter of text) {
		const cell = CELLS_BY_LETTER.get(letter);
		if (cell === undefined) return null;
		cells.push(cell);
	}

	return Array.from({ length: layerCount }, (_, layer) =>
		Array.from({ length: size }, (_, row) => {
			const start = layer * area + row * size;
			return cells.slice(start, start + size);
		}),
	);
}

export function decodeMazeQr(text: string): DecodeMazeQrResult {
	const trimmed = text.trim();
	if (!trimmed.startsWith(PREFIX)) return { ok: false, reason: "notMazeQr" };

	// 一辺・向き・マスの3つの:より後をすべて名前とする（名前は:を含んでよい）
	const [sizeText, directionText, cellsText, ...nameParts] = trimmed
		.slice(PREFIX.length)
		.split(SEPARATOR);
	if (sizeText === undefined || directionText === undefined || cellsText === undefined) {
		return BROKEN;
	}
	if (nameParts.length === 0) return BROKEN;

	const size = parseSize(sizeText);
	if (size === null) return BROKEN;
	const startDirection = DIRECTIONS_BY_LETTER.get(directionText);
	if (startDirection === undefined) return BROKEN;
	const layers = parseLayers(cellsText, size);
	if (layers === null) return BROKEN;
	const name = nameOf(nameParts.join(SEPARATOR));
	if (name === null) return BROKEN;

	const maze: Maze = { layers, startDirection };
	if (!validateMaze(maze).ok) return BROKEN;
	return { ok: true, name, maze };
}
