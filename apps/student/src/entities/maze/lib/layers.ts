/*
 * 迷路の階ごとの描き分け（仕様書README.mdの「迷路の3D」「迷路の2D」「ホーム」）
 * 3Dは上の階だけを少し透かすので、マスの位置を階ごとに分ける
 * ホームのミニマップは、プレイを始めたときにロボットがいる階（スタートの階）を描く
 */
import type { Maze, Position } from "@kasane/core";

import { cellPositions } from "./scene-layout";
import type { CellPositions } from "./scene-layout";

export function cellPositionsByLayer(maze: Maze): CellPositions[] {
	const { tiles, byCell } = cellPositions(maze);
	return maze.layers.map((_, layer) => {
		const onLayer = (positions: Position[]) =>
			positions.filter((position) => position.layer === layer);
		return {
			tiles: onLayer(tiles),
			byCell: {
				floor: onLayer(byCell.floor),
				wall: onLayer(byCell.wall),
				hole: onLayer(byCell.hole),
				start: onLayer(byCell.start),
				goal: onLayer(byCell.goal),
				teleportUp: onLayer(byCell.teleportUp),
				teleportDown: onLayer(byCell.teleportDown),
				key: onLayer(byCell.key),
			},
		};
	});
}

// スタートのない迷路（validateMazeを通らないもの）は1階を描く
export function startLayer(maze: Maze): number {
	return cellPositions(maze).byCell.start[0]?.layer ?? 0;
}
