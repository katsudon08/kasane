/*
 * 自由モードの自分の迷路を変える（仕様書free-mode.mdの「記録」）
 * - 新しく作ったとき（QRでもらったときも）は要素を足し、変えたときはname・data・updatedAtを置き換え、消したときは要素を除く
 * - 保存する前に、名前は迷路の名前の決まり（前後の空白を削って1〜20文字、改行と制御文字なし）で、dataはvalidateMazeで確かめ、通らなければ保存しない
 * - 一覧はupdatedAtが新しい順、同じならmazeId順
 * - 元の一覧を書き換えず、新しい一覧を返す
 */
import { FLOOR, GOAL, START } from "@kasane/core";
import type { Cell, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { addMaze, removeMaze, replaceMaze } from "./maze-changes";
import type { FreeMaze } from "./stored-mazes";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";

const EARLIER = "2026-11-21T01:00:00.000Z";
const LATER = "2026-11-22T01:00:00.000Z";
const NOW = "2026-11-23T01:00:00.000Z";

// 一辺5の迷路。左上にスタート、goalAtにゴール、ほかはすべて床
function mazeOf(goalAt: { y: number; x: number } = { y: 4, x: 4 }): Maze {
	const layers = [
		Array.from({ length: 5 }, (_, y) =>
			Array.from({ length: 5 }, (_, x): Cell => {
				if (y === 0 && x === 0) return START;
				if (y === goalAt.y && x === goalAt.x) return GOAL;
				return FLOOR;
			}),
		),
	];
	return { layers, startDirection: "east" };
}

// ゴールのない迷路（validateMazeを通らない）
function mazeWithoutGoal(): Maze {
	const data = mazeOf();
	return {
		...data,
		layers: data.layers.map((layer) =>
			layer.map((row) => row.map((cell) => (cell === GOAL ? FLOOR : cell))),
		),
	};
}

function storedMaze(overrides: Partial<FreeMaze> = {}): FreeMaze {
	return {
		mazeId: ID_A,
		name: "めいろ1",
		data: mazeOf(),
		createdAt: EARLIER,
		updatedAt: EARLIER,
		...overrides,
	};
}

describe("addMaze", () => {
	it("新しい迷路を、作った時刻をcreatedAtとupdatedAtにして足す", () => {
		const result = addMaze(
			[],
			{ name: "じゆうのめいろ", data: mazeOf() },
			{ mazeId: ID_A, now: NOW },
		);
		expect(result).toEqual({
			ok: true,
			mazes: [
				{ mazeId: ID_A, name: "じゆうのめいろ", data: mazeOf(), createdAt: NOW, updatedAt: NOW },
			],
		});
	});

	it("足した迷路は、updatedAtが新しいので一覧の先頭に来る", () => {
		const older = storedMaze({ mazeId: ID_B, updatedAt: LATER });
		const result = addMaze(
			[older],
			{ name: "あたらしい", data: mazeOf() },
			{ mazeId: ID_A, now: NOW },
		);
		expect(result.ok && result.mazes.map(({ mazeId }) => mazeId)).toEqual([ID_A, ID_B]);
	});

	it("名前の前後の空白は削って保存する", () => {
		const result = addMaze([], { name: " めいろ ", data: mazeOf() }, { mazeId: ID_A, now: NOW });
		expect(result.ok && result.mazes[0]?.name).toBe("めいろ");
	});

	it("名前が20文字なら保存する", () => {
		const name = "あ".repeat(20);
		const result = addMaze([], { name, data: mazeOf() }, { mazeId: ID_A, now: NOW });
		expect(result.ok && result.mazes[0]?.name).toBe(name);
	});

	it("同じ名前の迷路があっても、別の迷路として足す", () => {
		const same = storedMaze({ mazeId: ID_B, name: "めいろ1" });
		const result = addMaze([same], { name: "めいろ1", data: mazeOf() }, { mazeId: ID_A, now: NOW });
		expect(result.ok && result.mazes).toHaveLength(2);
	});

	it.each([
		{ label: "空", name: "" },
		{ label: "空白だけ", name: "   " },
		{ label: "21文字", name: "あ".repeat(21) },
		{ label: "改行がある", name: "めい\nろ" },
		{ label: "制御文字（タブ）がある", name: "めい\tろ" },
	])("名前が$labelなら保存しない", ({ name }) => {
		expect(addMaze([], { name, data: mazeOf() }, { mazeId: ID_A, now: NOW })).toEqual({
			ok: false,
			reason: "invalidName",
		});
	});

	it("validateMazeを通らない迷路は保存しない", () => {
		expect(
			addMaze([], { name: "めいろ", data: mazeWithoutGoal() }, { mazeId: ID_A, now: NOW }),
		).toEqual({ ok: false, reason: "invalidMaze" });
	});

	it("元の一覧を書き換えない", () => {
		const mazes = [storedMaze({ mazeId: ID_B })];
		addMaze(mazes, { name: "めいろ", data: mazeOf() }, { mazeId: ID_A, now: NOW });
		expect(mazes).toEqual([storedMaze({ mazeId: ID_B })]);
	});
});

describe("replaceMaze", () => {
	it("name・data・updatedAtを置き換え、mazeIdとcreatedAtは残す", () => {
		const maze = storedMaze({ mazeId: ID_A });
		const changed = mazeOf({ y: 0, x: 4 });
		const result = replaceMaze([maze], ID_A, { name: "かえた", data: changed }, NOW);
		expect(result).toEqual({
			ok: true,
			mazes: [{ mazeId: ID_A, name: "かえた", data: changed, createdAt: EARLIER, updatedAt: NOW }],
		});
	});

	it("名前の前後の空白は削って保存する", () => {
		const a = storedMaze({ mazeId: ID_A });
		const result = replaceMaze([a], ID_A, { name: " かえた ", data: mazeOf() }, NOW);
		expect(result.ok && result.mazes[0]?.name).toBe("かえた");
	});

	it("変えた迷路は、updatedAtが新しいので一覧の先頭に来る", () => {
		const a = storedMaze({ mazeId: ID_A, updatedAt: EARLIER });
		const b = storedMaze({ mazeId: ID_B, updatedAt: LATER });
		const result = replaceMaze([b, a], ID_A, { name: "かえた", data: mazeOf() }, NOW);
		expect(result.ok && result.mazes.map(({ mazeId }) => mazeId)).toEqual([ID_A, ID_B]);
	});

	it("ほかの迷路は変えない", () => {
		const a = storedMaze({ mazeId: ID_A });
		const b = storedMaze({ mazeId: ID_B, name: "そのまま", updatedAt: LATER });
		const result = replaceMaze([a, b], ID_A, { name: "かえた", data: mazeOf() }, NOW);
		expect(result.ok && result.mazes.find(({ mazeId }) => mazeId === ID_B)).toEqual(b);
	});

	it("ない迷路は変えられない", () => {
		const a = storedMaze({ mazeId: ID_A });
		expect(replaceMaze([a], ID_C, { name: "かえた", data: mazeOf() }, NOW)).toEqual({
			ok: false,
			reason: "notFound",
		});
	});

	it("名前が決まりに合わなければ保存しない", () => {
		const a = storedMaze({ mazeId: ID_A });
		expect(replaceMaze([a], ID_A, { name: "", data: mazeOf() }, NOW)).toEqual({
			ok: false,
			reason: "invalidName",
		});
	});

	it("validateMazeを通らない迷路は保存しない", () => {
		const a = storedMaze({ mazeId: ID_A });
		expect(replaceMaze([a], ID_A, { name: "かえた", data: mazeWithoutGoal() }, NOW)).toEqual({
			ok: false,
			reason: "invalidMaze",
		});
	});

	it("元の一覧を書き換えない", () => {
		const mazes = [storedMaze({ mazeId: ID_A })];
		replaceMaze(mazes, ID_A, { name: "かえた", data: mazeOf() }, NOW);
		expect(mazes).toEqual([storedMaze({ mazeId: ID_A })]);
	});
});

describe("removeMaze", () => {
	it("その迷路だけを除く", () => {
		const a = storedMaze({ mazeId: ID_A, updatedAt: LATER });
		const b = storedMaze({ mazeId: ID_B });
		expect(removeMaze([a, b], ID_A)).toEqual([b]);
	});

	it("ない迷路を消しても、一覧は変わらない", () => {
		const a = storedMaze({ mazeId: ID_A });
		expect(removeMaze([a], ID_C)).toEqual([a]);
	});

	it("元の一覧を書き換えない", () => {
		const mazes = [storedMaze({ mazeId: ID_A })];
		removeMaze(mazes, ID_A);
		expect(mazes).toEqual([storedMaze({ mazeId: ID_A })]);
	});
});
