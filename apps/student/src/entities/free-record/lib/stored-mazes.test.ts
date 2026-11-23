/*
 * 自由モードの自分の迷路（仕様書free-mode.mdの「記録」）
 * - localStorageから読み出したとき、読めない値は空の一覧として扱うこと
 * - 迷路は一つずつ形（backend.mdの「入力の上限」と同じ範囲）とvalidateMazeを確かめ、通らないものは出さないこと
 * - 一覧はupdatedAtが新しい順、同じならmazeId順に並べること（GET /me/mazesと同じ）
 */
import { FLOOR, GOAL, START } from "@kasane/core";
import type { Cell, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { readMazes, sortMazes } from "./stored-mazes";
import type { FreeMaze } from "./stored-mazes";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";

// 一辺sizeの迷路。左上にスタート、右下にゴール、ほかはすべて床
function mazeOf(size = 5, layerCount = 1): Maze {
	const layers = Array.from({ length: layerCount }, (_, layer) =>
		Array.from({ length: size }, (_, y) =>
			Array.from({ length: size }, (_, x): Cell => {
				if (layer === 0 && y === 0 && x === 0) return START;
				if (layer === 0 && y === size - 1 && x === size - 1) return GOAL;
				return FLOOR;
			}),
		),
	);
	return { layers, startDirection: "east" };
}

function storedMaze(overrides: Partial<FreeMaze> = {}): FreeMaze {
	return {
		mazeId: ID_A,
		name: "めいろ1",
		data: mazeOf(),
		createdAt: "2026-11-20T01:00:00.000Z",
		updatedAt: "2026-11-21T01:00:00.000Z",
		...overrides,
	};
}

// mazeOf()の1階の(y, x)のマスをvalueにしたdata（形が合わないものを作るため、型はunknownにする）
function dataWithCell(y: number, x: number, value: unknown) {
	const data = mazeOf();
	const layers = data.layers.map((layer, l) =>
		layer.map((row, r) =>
			row.map((cell, c): unknown => (l === 0 && r === y && c === x ? value : cell)),
		),
	);
	return { ...data, layers };
}

// localStorageに保存されている文字列
function stored(values: unknown[]): string {
	return JSON.stringify(values);
}

describe("readMazes", () => {
	it("保存されていなければ空の一覧", () => {
		expect(readMazes(null)).toEqual([]);
	});

	it.each([
		{ label: "JSONとして読めない値", value: "{" },
		{ label: "配列でない値", value: "{}" },
		{ label: "数", value: "3" },
		{ label: "null", value: "null" },
	])("$labelは空の一覧として扱う", ({ value }) => {
		expect(readMazes(value)).toEqual([]);
	});

	it("正しい迷路はそのまま読む", () => {
		const maze = storedMaze({ data: mazeOf(7, 3) });
		expect(readMazes(stored([maze]))).toEqual([maze]);
	});

	it("updatedAtが新しい順に並べる", () => {
		const older = storedMaze({ mazeId: ID_A, updatedAt: "2026-11-21T01:00:00.000Z" });
		const newest = storedMaze({ mazeId: ID_B, updatedAt: "2026-11-23T01:00:00.000Z" });
		const middle = storedMaze({ mazeId: ID_C, updatedAt: "2026-11-22T01:00:00.000Z" });
		expect(readMazes(stored([older, newest, middle]))).toEqual([newest, middle, older]);
	});

	it("updatedAtが同じなら、mazeId順に並べる", () => {
		const sameTime = "2026-11-22T01:00:00.000Z";
		const c = storedMaze({ mazeId: ID_C, updatedAt: sameTime });
		const a = storedMaze({ mazeId: ID_A, updatedAt: sameTime });
		const b = storedMaze({ mazeId: ID_B, updatedAt: sameTime });
		expect(readMazes(stored([c, a, b]))).toEqual([a, b, c]);
	});

	describe("形が合わない迷路は出さず、ほかの迷路は残す", () => {
		const valid = storedMaze({ mazeId: ID_B });

		it.each([
			{ label: "迷路でない値", entry: "めいろ" },
			{ label: "null", entry: null },
			{ label: "mazeIdがUUIDでない", entry: storedMaze({ mazeId: "1" }) },
			{ label: "名前が空", entry: storedMaze({ name: "" }) },
			{ label: "名前が空白だけ", entry: storedMaze({ name: "   " }) },
			{ label: "名前が21文字", entry: storedMaze({ name: "あ".repeat(21) }) },
			{ label: "名前に改行がある", entry: storedMaze({ name: "めい\nろ" }) },
			{ label: "名前に制御文字（タブ）がある", entry: storedMaze({ name: "めい\tろ" }) },
			{ label: "階が4つある", entry: storedMaze({ data: mazeOf(5, 4) }) },
			{ label: "一辺が4マス", entry: storedMaze({ data: mazeOf(4) }) },
			{ label: "一辺が8マス", entry: storedMaze({ data: mazeOf(8) }) },
			{ label: "知らないマスがある", entry: { ...storedMaze(), data: dataWithCell(2, 2, "lava") } },
			{
				label: "向きが4方向のどれでもない",
				entry: { ...storedMaze(), data: { ...mazeOf(), startDirection: "up" } },
			},
			{ label: "updatedAtが日時でない", entry: storedMaze({ updatedAt: "きのう" }) },
			{ label: "createdAtが日時でない", entry: storedMaze({ createdAt: "きのう" }) },
			{
				label: "updatedAtの末尾にZがない",
				entry: storedMaze({ updatedAt: "2026-11-21T01:00:00.000" }),
			},
			{
				label: "createdAtがない",
				entry: {
					mazeId: ID_A,
					name: "めいろ1",
					data: mazeOf(),
					updatedAt: "2026-11-21T01:00:00.000Z",
				},
			},
		])("$label", ({ entry }) => {
			expect(readMazes(stored([entry, valid]))).toEqual([valid]);
		});
	});

	describe("迷路の名前の決まり（前後の空白を削って1〜20文字）に合う名前は読む", () => {
		it("名前が20文字", () => {
			const maze = storedMaze({ name: "あ".repeat(20) });
			expect(readMazes(stored([maze]))).toEqual([maze]);
		});

		// 削った名前で返すかどうかは仕様で決めていないので、一覧に残ることだけを確かめる
		it("前後に空白がある名前", () => {
			const maze = storedMaze({ name: " めいろ " });
			expect(readMazes(stored([maze])).map(({ mazeId }) => mazeId)).toEqual([ID_A]);
		});
	});

	describe("validateMazeを通らない迷路は出さず、ほかの迷路は残す", () => {
		const valid = storedMaze({ mazeId: ID_B });

		it("スタートが二つある", () => {
			const data = mazeOf();
			const layers = data.layers.map((layer, l) =>
				layer.map((row, y) => row.map((cell, x) => (l === 0 && y === 2 && x === 2 ? START : cell))),
			);
			const entry = storedMaze({ data: { ...data, layers } });
			expect(readMazes(stored([entry, valid]))).toEqual([valid]);
		});

		it("ゴールがない", () => {
			const data = mazeOf();
			const layers = data.layers.map((layer) =>
				layer.map((row) => row.map((cell) => (cell === GOAL ? FLOOR : cell))),
			);
			const entry = storedMaze({ data: { ...data, layers } });
			expect(readMazes(stored([entry, valid]))).toEqual([valid]);
		});

		it("正方形でない（5行6列）", () => {
			const data = mazeOf();
			const layers = data.layers.map((layer) => layer.map((row) => [...row, FLOOR]));
			const entry = storedMaze({ data: { ...data, layers } });
			expect(readMazes(stored([entry, valid]))).toEqual([valid]);
		});
	});
});

describe("sortMazes", () => {
	it("updatedAtが新しい順、同じならmazeId順にした新しい配列を返し、元の配列は変えない", () => {
		const a = storedMaze({ mazeId: ID_A, updatedAt: "2026-11-21T01:00:00.000Z" });
		const b = storedMaze({ mazeId: ID_B, updatedAt: "2026-11-22T01:00:00.000Z" });
		const c = storedMaze({ mazeId: ID_C, updatedAt: "2026-11-21T01:00:00.000Z" });
		const mazes = [c, a, b];

		expect(sortMazes(mazes)).toEqual([b, a, c]);
		expect(mazes).toEqual([c, a, b]);
	});
});
