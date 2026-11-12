/*
 * マスをタップしたときに呼ぶ編集の関数を選ぶ（仕様書domain.mdの「迷路の編集（児童の端末）」の画面側の割り当て）
 * 選んでいる道具がSTARTで、タップしたマスがSTARTならrotateStart。それ以外のタップはplaceCell
 */
import { START } from "@kasane/core";
import type { Cell, Maze, Position } from "@kasane/core";

import { placeCell, rotateStart } from "./maze-edit";
import type { EditResult } from "./maze-edit";

export function tapCell(maze: Maze, tool: Cell, at: Position): EditResult {
	if (tool === START && maze.layers[at.layer]?.[at.y]?.[at.x] === START) {
		return { ok: true, maze: rotateStart(maze) };
	}
	return placeCell(maze, tool, at);
}
