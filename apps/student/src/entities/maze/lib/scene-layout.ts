/*
 * 迷路の3Dと2Dでマスを置く場所（仕様書domain.mdの「迷路」、README.mdの「迷路の3D」「迷路の2D」）
 * 3Dは1マスを1の大きさにし、迷路の中心を原点に置く。xは列（east）、zは行（south）、yは階（上）
 */
import type { Cell, Direction, Maze, Position } from "@kasane/core";

export type Vec3 = readonly [number, number, number];

// 階と階の高さの差。壁（高さWALL_HEIGHT）の上に上の階の床が重ならないように離す
export const LAYER_GAP = 3;
export const WALL_HEIGHT = 1;

// 「1F」「2F」の文字を、迷路の左の外側にどれだけ離して置くか
const LABEL_MARGIN = 1;
const LABEL_HEIGHT = 0.6;

// マスの中心で、床のタイルの上面（ロボットが立つ高さ）の位置
export function cellCenter(size: number, { layer, y, x }: Position): Vec3 {
	const half = (size - 1) / 2;
	return [x - half, layer * LAYER_GAP, y - half];
}

/*
 * 向きを、y軸まわりの回転の角度に直す表。回していないロボットのモデルは+x（east）を向いている
 * y軸まわりに角度θ回すと、+xは(cosθ, 0, -sinθ)を向く。northは行が減る向き（-z）なのでπ/2
 */
export const DIRECTION_ANGLES: Readonly<Record<Direction, number>> = {
	east: 0,
	north: Math.PI / 2,
	west: Math.PI,
	south: -Math.PI / 2,
};

// 各階の「1F」「2F」の文字の位置。迷路の左手前の角の外側
export function layerLabelPosition(size: number, layer: number): Vec3 {
	const half = size / 2;
	return [-half - LABEL_MARGIN, layer * LAYER_GAP + LABEL_HEIGHT, half];
}

export type CellPositions = {
	// 床のタイルを敷くマス（壁の他のすべて。床は他のマスの土台にもなる）
	tiles: Position[];
	// マスの種類ごとの位置
	byCell: Readonly<Record<Cell, Position[]>>;
};

export function cellPositions(maze: Maze): CellPositions {
	const byCell: Record<Cell, Position[]> = {
		floor: [],
		wall: [],
		hole: [],
		start: [],
		goal: [],
		teleportUp: [],
		teleportDown: [],
		key: [],
	};
	const tiles: Position[] = [];
	maze.layers.forEach((rows, layer) => {
		rows.forEach((cells, y) => {
			cells.forEach((cell, x) => {
				byCell[cell].push({ layer, y, x });
				if (cell !== "wall") tiles.push({ layer, y, x });
			});
		});
	});
	return { tiles, byCell };
}
