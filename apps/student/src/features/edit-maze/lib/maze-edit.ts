/*
 * 迷路の編集（仕様書domain.mdの「迷路の編集（児童の端末）」）
 * 操作ごとに一つの関数にし、どれを呼ぶかは画面側が決める（関数はタップの意味を知らない）
 * ok: trueで返すMazeは、必ずvalidateMazeを通る。置けない・減らせないときは理由を値で返す
 * どの関数も元のMazeを書き換えず、変える階と行だけを複製し、残りは元の配列を共有した新しいMazeを返す
 * 範囲外のPositionのような呼び出し側の誤りだけ例外にする
 */
import { FLOOR, GOAL, HOLE, START, TELEPORT_DOWN, TELEPORT_UP, WALL } from "@kasane/core";
import type { Cell, Direction, Maze, Position } from "@kasane/core";

export type MazeSize = 5 | 6 | 7;

export const MAX_LAYERS = 3;

export type EditError =
	// スタートの上に別の道具を塗ろうとした
	| "startCannotBeOverwritten"
	// ゴールの上に別の道具を塗ろうとした
	| "goalCannotBeOverwritten"
	// 最上階にうえへテレポート
	| "noLayerAbove"
	// 1階にしたへテレポート
	| "noLayerBelow"
	// テレポートの行き先のマスが壁・穴・テレポート
	| "teleportTargetBlocked"
	// 隣の階のテレポートの行き先のマスに壁・穴・テレポートを塗ろうとした
	| "isTeleportTarget"
	// 3階より上に足そうとした
	| "maxLayers"
	// 1階を減らそうとした
	| "minLayers"
	// 減らす階にスタートかゴールがある
	| "layerHasStartOrGoal"
	// 減らす階が、下の階のうえへテレポートの行き先
	| "layerIsTeleportTarget";

export type EditResult = { ok: true; maze: Maze } | { ok: false; reason: EditError };

// テレポートの行き先に置けないマス（validateMazeと同じ）
const TELEPORT_BLOCKERS: ReadonlySet<Cell> = new Set<Cell>([
	WALL,
	HOLE,
	TELEPORT_UP,
	TELEPORT_DOWN,
]);

const NEXT_DIRECTION: Readonly<Record<Direction, Direction>> = {
	east: "south",
	south: "west",
	west: "north",
	north: "east",
};

function floorLayer(size: number): Cell[][] {
	return Array.from({ length: size }, () => Array.from({ length: size }, () => FLOOR));
}

export function createMaze(size: MazeSize): Maze {
	const layer = floorLayer(size);
	layer[0]![0] = START;
	layer[size - 1]![size - 1] = GOAL;
	return { layers: [layer], startDirection: "east" };
}

function cellAt(maze: Maze, { layer, y, x }: Position): Cell | undefined {
	return maze.layers[layer]?.[y]?.[x];
}

function findCell(maze: Maze, target: Cell): Position | undefined {
	for (const [layer, rows] of maze.layers.entries()) {
		for (const [y, row] of rows.entries()) {
			const x = row.indexOf(target);
			if (x !== -1) return { layer, y, x };
		}
	}
	return undefined;
}

// 置く場所の順に断る条件を見る。通ればundefined
function placeError(maze: Maze, cell: Cell, at: Position, current: Cell): EditError | undefined {
	if (current === START && cell !== START) return "startCannotBeOverwritten";
	if (current === GOAL && cell !== GOAL) return "goalCannotBeOverwritten";

	const top = maze.layers.length - 1;
	if (cell === TELEPORT_UP && at.layer === top) return "noLayerAbove";
	if (cell === TELEPORT_DOWN && at.layer === 0) return "noLayerBelow";
	if (cell === TELEPORT_UP || cell === TELEPORT_DOWN) {
		const target = cellAt(maze, {
			...at,
			layer: cell === TELEPORT_UP ? at.layer + 1 : at.layer - 1,
		});
		if (target !== undefined && TELEPORT_BLOCKERS.has(target)) return "teleportTargetBlocked";
	}

	if (TELEPORT_BLOCKERS.has(cell)) {
		const below = cellAt(maze, { ...at, layer: at.layer - 1 });
		const above = cellAt(maze, { ...at, layer: at.layer + 1 });
		if (below === TELEPORT_UP || above === TELEPORT_DOWN) return "isTeleportTarget";
	}
	return undefined;
}

// 変える階と行だけを複製して、マスを置き換える
function withCells(maze: Maze, changes: readonly { at: Position; cell: Cell }[]): Maze {
	const layers = [...maze.layers];
	const copiedLayers = new Set<number>();
	const copiedRows = new Set<string>();
	for (const { at, cell } of changes) {
		if (!copiedLayers.has(at.layer)) {
			layers[at.layer] = [...layers[at.layer]!];
			copiedLayers.add(at.layer);
		}
		const rows = layers[at.layer]!;
		const rowKey = `${at.layer}-${at.y}`;
		if (!copiedRows.has(rowKey)) {
			rows[at.y] = [...rows[at.y]!];
			copiedRows.add(rowKey);
		}
		rows[at.y]![at.x] = cell;
	}
	return { ...maze, layers };
}

export function placeCell(maze: Maze, cell: Cell, at: Position): EditResult {
	const current = cellAt(maze, at);
	if (current === undefined) {
		throw new Error(`迷路の外の位置（${at.layer}階${at.y}行${at.x}列）`);
	}

	const reason = placeError(maze, cell, at, current);
	if (reason !== undefined) return { ok: false, reason };

	// STARTとGOALは一つだけなので、前の場所をFLOORに戻す
	const previous = cell === START || cell === GOAL ? findCell(maze, cell) : undefined;
	const changes =
		previous === undefined
			? [{ at, cell }]
			: [
					{ at: previous, cell: FLOOR },
					{ at, cell },
				];
	return { ok: true, maze: withCells(maze, changes) };
}

export function rotateStart(maze: Maze): Maze {
	return { ...maze, startDirection: NEXT_DIRECTION[maze.startDirection] };
}

export function addLayer(maze: Maze): EditResult {
	if (maze.layers.length >= MAX_LAYERS) return { ok: false, reason: "maxLayers" };

	const size = maze.layers[0]?.length ?? 0;
	return { ok: true, maze: { ...maze, layers: [...maze.layers, floorLayer(size)] } };
}

export function removeTopLayer(maze: Maze): EditResult {
	const top = maze.layers.length - 1;
	if (top === 0) return { ok: false, reason: "minLayers" };

	const topRows = maze.layers[top] ?? [];
	if (topRows.some((row) => row.includes(START) || row.includes(GOAL))) {
		return { ok: false, reason: "layerHasStartOrGoal" };
	}
	const belowRows = maze.layers[top - 1] ?? [];
	if (belowRows.some((row) => row.includes(TELEPORT_UP))) {
		return { ok: false, reason: "layerIsTeleportTarget" };
	}
	return { ok: true, maze: { ...maze, layers: maze.layers.slice(0, top) } };
}
