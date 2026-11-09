/*
 * 迷路の型・マスの定数・迷路の正しさ（仕様書domain.mdの「迷路」）
 */

export type Direction = "north" | "east" | "south" | "west";

export type Cell =
	| "floor"
	| "wall"
	| "hole"
	| "start"
	| "goal"
	| "teleportUp"
	| "teleportDown"
	| "key";

export type Maze = {
	// layers[階][行][列]。0が1階、行は上から下、列は左から右。1〜3階、一辺5〜7マスの正方形
	layers: Cell[][][];
	// ロボットが最初に向いている方向
	startDirection: Direction;
};

export type Position = { layer: number; y: number; x: number };

export const FLOOR: Cell = "floor";
export const WALL: Cell = "wall";
export const HOLE: Cell = "hole";
export const START: Cell = "start";
export const GOAL: Cell = "goal";
export const TELEPORT_UP: Cell = "teleportUp";
export const TELEPORT_DOWN: Cell = "teleportDown";
export const KEY: Cell = "key";

// 向きを[dx, dy]に直す表。xは列（左が0）、yは行（上が0）なので、eastはxが増え、southはyが増える
export const DIRECTION_VECTORS: Readonly<Record<Direction, readonly [number, number]>> = {
	north: [0, -1],
	east: [1, 0],
	south: [0, 1],
	west: [-1, 0],
};

export type MazeError =
	// 正方形でない、または階ごとに大きさが違う
	| "NOT_SQUARE"
	// startが全階を合わせてちょうど一つでない
	| "START_COUNT"
	// goalが全階を合わせてちょうど一つでない
	| "GOAL_COUNT"
	// teleportUpの上の階、teleportDownの下の階がない
	| "TELEPORT_NO_LAYER"
	// テレポートの行き先のマスが壁・穴・テレポート
	| "TELEPORT_TARGET_BLOCKED";

export type ValidateMazeResult = { ok: true } | { ok: false; reason: MazeError };

const TELEPORT_BLOCKERS: ReadonlySet<Cell> = new Set<Cell>([
	WALL,
	HOLE,
	TELEPORT_UP,
	TELEPORT_DOWN,
]);

function isSquare(layers: Cell[][][]): boolean {
	const size = layers[0]?.length ?? 0;
	return layers.every(
		(layer) => layer.length === size && layer.every((row) => row.length === size),
	);
}

function countCells(layers: Cell[][][], target: Cell): number {
	let count = 0;
	for (const layer of layers) {
		for (const row of layer) {
			for (const cell of row) {
				if (cell === target) count += 1;
			}
		}
	}
	return count;
}

function findTeleportError(layers: Cell[][][]): MazeError | undefined {
	for (const [layerIndex, layer] of layers.entries()) {
		for (const [y, row] of layer.entries()) {
			for (const [x, cell] of row.entries()) {
				if (cell !== TELEPORT_UP && cell !== TELEPORT_DOWN) continue;
				const targetLayer = layers[cell === TELEPORT_UP ? layerIndex + 1 : layerIndex - 1];
				if (targetLayer === undefined) return "TELEPORT_NO_LAYER";
				const target = targetLayer[y]?.[x];
				if (target === undefined || TELEPORT_BLOCKERS.has(target)) {
					return "TELEPORT_TARGET_BLOCKED";
				}
			}
		}
	}
	return undefined;
}

/*
 * 迷路の正しさを確かめる。階の数と一辺の長さの範囲、マスの種類はTypeBoxで見るので、ここでは見ない
 * 確かめないもの: ゴールまでたどり着けるか、鍵の数、startDirectionが壁を向いていないか
 */
export function validateMaze(maze: Maze): ValidateMazeResult {
	const { layers } = maze;
	if (!isSquare(layers)) return { ok: false, reason: "NOT_SQUARE" };
	if (countCells(layers, START) !== 1) return { ok: false, reason: "START_COUNT" };
	if (countCells(layers, GOAL) !== 1) return { ok: false, reason: "GOAL_COUNT" };
	const teleportError = findTeleportError(layers);
	if (teleportError !== undefined) return { ok: false, reason: teleportError };
	return { ok: true };
}
