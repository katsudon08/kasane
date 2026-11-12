/*
 * めいろをつくる / 変える画面の状態（仕様書README.mdの「めいろをつくる / 変える」）
 * - 大きさ（5・6・7）は新しく作るときだけ選び、後から変えない
 * - マスをタップするとその道具で塗る。置けないときは塗らず、理由を出す（3秒ほどで消す）
 * - 階を足す・いちばん上の階を減らす。減らせないときも同じ場所に理由を出す
 * - 今編集している階を切り替える
 */
import { FLOOR, GOAL, HOLE, KEY, START, WALL, validateMaze } from "@kasane/core";
import type { Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { createMaze } from "../../../features/edit-maze";
import { editorReducer, initialEditorState } from "./editor-reducer";
import type { EditorAction, EditorState } from "./editor-reducer";

function run(state: EditorState, ...actions: EditorAction[]): EditorState {
	return actions.reduce(editorReducer, state);
}

function cellAt(maze: Maze, layer: number, y: number, x: number) {
	return maze.layers[layer]?.[y]?.[x];
}

describe("initialEditorState", () => {
	it("渡した迷路の1階を、何も変えていない状態で開く", () => {
		const maze = createMaze(6);

		const state = initialEditorState(maze);

		expect(state.maze).toBe(maze);
		expect(state.layer).toBe(0);
		expect(state.edited).toBe(false);
		expect(state.error).toBeNull();
	});
});

describe("大きさを選ぶ", () => {
	it("まだ何も変えていなければ、選んだ大きさの新しい迷路にする", () => {
		const state = run(initialEditorState(createMaze(5)), { type: "sizeChosen", size: 7 });

		expect(state.maze).toEqual(createMaze(7));
		expect(state.edited).toBe(false);
	});

	it("一度でも形を変えた後は、大きさを変えない（途中で変えると形が崩れるため）", () => {
		const painted = run(initialEditorState(createMaze(5)), {
			type: "cellTapped",
			y: 2,
			x: 2,
			tool: WALL,
		});

		const state = run(painted, { type: "sizeChosen", size: 7 });

		expect(state).toBe(painted);
	});
});

describe("マスをタップする", () => {
	it("選んでいる道具で、今編集している階のマスを塗る", () => {
		const state = run(initialEditorState(createMaze(5)), {
			type: "cellTapped",
			y: 1,
			x: 3,
			tool: HOLE,
		});

		expect(cellAt(state.maze, 0, 1, 3)).toBe(HOLE);
		expect(state.edited).toBe(true);
		expect(state.error).toBeNull();
	});

	it("2階を編集しているときは、2階のマスを塗る", () => {
		const state = run(
			initialEditorState(createMaze(5)),
			{ type: "layerAdded" },
			{ type: "cellTapped", y: 1, x: 1, tool: KEY },
		);

		expect(cellAt(state.maze, 1, 1, 1)).toBe(KEY);
		expect(cellAt(state.maze, 0, 1, 1)).toBe(FLOOR);
	});

	it("STARTの道具でSTARTのマスをタップすると、向きを右回りに変える", () => {
		const state = run(initialEditorState(createMaze(5)), {
			type: "cellTapped",
			y: 0,
			x: 0,
			tool: START,
		});

		expect(state.maze.startDirection).toBe("south");
		expect(state.edited).toBe(true);
	});

	it("置けないときは塗らずに、理由を出す", () => {
		const before = initialEditorState(createMaze(5));

		const state = run(before, { type: "cellTapped", y: 4, x: 4, tool: WALL });

		expect(state.maze).toBe(before.maze);
		expect(state.edited).toBe(false);
		expect(state.error?.reason).toBe("goalCannotBeOverwritten");
	});

	it("同じ理由で続けて断られても、新しい知らせとして出し直す（出している時間を数え直す）", () => {
		const first = run(initialEditorState(createMaze(5)), {
			type: "cellTapped",
			y: 4,
			x: 4,
			tool: WALL,
		});

		const second = run(first, { type: "cellTapped", y: 4, x: 4, tool: WALL });

		expect(second.error?.reason).toBe("goalCannotBeOverwritten");
		expect(second.error).not.toBe(first.error);
	});

	it("塗れたら、出していた理由を消す", () => {
		const state = run(
			initialEditorState(createMaze(5)),
			{ type: "cellTapped", y: 4, x: 4, tool: WALL },
			{ type: "cellTapped", y: 2, x: 2, tool: WALL },
		);

		expect(state.error).toBeNull();
	});
});

describe("理由の知らせが時間切れになる", () => {
	it("出している知らせが時間切れになったら消す", () => {
		const failed = run(initialEditorState(createMaze(5)), {
			type: "cellTapped",
			y: 0,
			x: 0,
			tool: WALL,
		});

		const state = run(failed, { type: "errorExpired", error: failed.error! });

		expect(state.error).toBeNull();
	});

	it("前の知らせの時間切れでは、後から出した知らせを消さない", () => {
		const first = run(initialEditorState(createMaze(5)), {
			type: "cellTapped",
			y: 0,
			x: 0,
			tool: WALL,
		});
		const second = run(first, { type: "layerRemoved" });

		const state = run(second, { type: "errorExpired", error: first.error! });

		expect(state.error?.reason).toBe("minLayers");
	});
});

describe("階を足す・減らす", () => {
	it("階を足すと、足した階を編集する", () => {
		const state = run(initialEditorState(createMaze(5)), { type: "layerAdded" });

		expect(state.maze.layers).toHaveLength(2);
		expect(state.layer).toBe(1);
		expect(state.edited).toBe(true);
	});

	it("3階あるときに足そうとしたら、理由を出す", () => {
		const three = run(
			initialEditorState(createMaze(5)),
			{ type: "layerAdded" },
			{ type: "layerAdded" },
		);

		const state = run(three, { type: "layerAdded" });

		expect(state.maze).toBe(three.maze);
		expect(state.error?.reason).toBe("maxLayers");
	});

	it("いちばん上の階を編集しているときに減らすと、一つ下の階を編集する", () => {
		const state = run(
			initialEditorState(createMaze(5)),
			{ type: "layerAdded" },
			{ type: "layerAdded" },
			{ type: "layerRemoved" },
		);

		expect(state.maze.layers).toHaveLength(2);
		expect(state.layer).toBe(1);
	});

	it("下の階を編集しているときに減らしても、その階のまま", () => {
		const state = run(
			initialEditorState(createMaze(5)),
			{ type: "layerAdded" },
			{ type: "layerAdded" },
			{ type: "layerChosen", layer: 0 },
			{ type: "layerRemoved" },
		);

		expect(state.layer).toBe(0);
	});

	it("1階だけのときに減らそうとしたら、理由を出す", () => {
		const state = run(initialEditorState(createMaze(5)), { type: "layerRemoved" });

		expect(state.maze.layers).toHaveLength(1);
		expect(state.error?.reason).toBe("minLayers");
	});

	it("いちばん上の階にゴールがあれば、減らさずに理由を出す", () => {
		const state = run(
			initialEditorState(createMaze(5)),
			{ type: "layerAdded" },
			{ type: "cellTapped", y: 0, x: 4, tool: GOAL },
			{ type: "layerRemoved" },
		);

		expect(state.maze.layers).toHaveLength(2);
		expect(state.error?.reason).toBe("layerHasStartOrGoal");
		expect(validateMaze(state.maze)).toEqual({ ok: true });
	});
});

describe("編集する階を切り替える", () => {
	it("ある階を選ぶと、その階を編集する", () => {
		const state = run(
			initialEditorState(createMaze(5)),
			{ type: "layerAdded" },
			{ type: "layerChosen", layer: 0 },
		);

		expect(state.layer).toBe(0);
	});

	it("ない階は選べない", () => {
		const before = initialEditorState(createMaze(5));

		const state = run(before, { type: "layerChosen", layer: 2 });

		expect(state).toBe(before);
	});
});
