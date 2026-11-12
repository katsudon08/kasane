/*
 * めいろをつくる / 変える画面の状態（仕様書README.mdの「めいろをつくる / 変える」）
 * - 編集中の迷路は端末のメモリだけに持つ（「できあがり」を押すまでサーバーへ送らない）
 * - 大きさは新しく作るときだけ選ぶ。一度でも形を変えた後は変えない（途中で変えると形が崩れるため）
 * - 置けない・減らせないときは形を変えずに理由を出す。理由は画面が3秒ほどで消す
 * 判断は編集の関数（features/edit-maze）に任せ、ここはその結果を状態に反映するだけにする
 */
import type { Cell, Maze } from "@kasane/core";

import { addLayer, createMaze, removeTopLayer, tapCell } from "../../../features/edit-maze";
import type { EditError, EditResult, MazeSize } from "../../../features/edit-maze";

// 出している理由。断られるたびに新しく作り、時間切れの知らせがどの理由のものかを見分ける
export type EditNotice = { reason: EditError };

export type EditorState = {
	maze: Maze;
	// 今編集している階（0が1階）
	layer: number;
	// 一度でも形を変えたか
	edited: boolean;
	error: EditNotice | null;
};

export type EditorAction =
	| { type: "sizeChosen"; size: MazeSize }
	| { type: "layerChosen"; layer: number }
	| { type: "cellTapped"; y: number; x: number; tool: Cell }
	| { type: "layerAdded" }
	| { type: "layerRemoved" }
	| { type: "errorExpired"; error: EditNotice };

export function initialEditorState(maze: Maze): EditorState {
	return { maze, layer: 0, edited: false, error: null };
}

// 編集の結果を反映する。通れば形を変えて理由を消し、断られたら形はそのままで理由を出す
function applied(
	state: EditorState,
	result: EditResult,
	layer: (maze: Maze) => number,
): EditorState {
	if (!result.ok) return { ...state, error: { reason: result.reason } };
	return { maze: result.maze, layer: layer(result.maze), edited: true, error: null };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
	switch (action.type) {
		case "sizeChosen":
			if (state.edited) return state;
			return initialEditorState(createMaze(action.size));
		case "layerChosen":
			if (action.layer < 0 || action.layer >= state.maze.layers.length) return state;
			return { ...state, layer: action.layer };
		case "cellTapped": {
			const at = { layer: state.layer, y: action.y, x: action.x };
			return applied(state, tapCell(state.maze, action.tool, at), () => state.layer);
		}
		case "layerAdded":
			// 足した階を続けて編集する
			return applied(state, addLayer(state.maze), (maze) => maze.layers.length - 1);
		case "layerRemoved":
			return applied(state, removeTopLayer(state.maze), (maze) =>
				Math.min(state.layer, maze.layers.length - 1),
			);
		case "errorExpired":
			return state.error === action.error ? { ...state, error: null } : state;
	}
}
