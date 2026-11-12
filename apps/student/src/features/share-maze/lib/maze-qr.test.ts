/*
 * 迷路のQR（仕様書domain.mdの「迷路のQR（児童の端末）」）
 * 中身は「KASANE-MAZE:1:一辺:向き:マス:名前」。マスは1マス1文字で、1階の1行目の左から右、2行目…、続けて2階、3階
 * encodeMazeQrした文字列をdecodeMazeQrに通すと、同じ名前と迷路に戻る
 * 目印と版が合わなければnotMazeQr、中身が迷路のルールに合わなければbrokenMaze
 */
import type { Cell, Direction, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { decodeMazeQr, encodeMazeQr } from "./maze-qr";

// 仕様書の「マスの文字」の表
const LETTERS: Record<string, Cell> = {
	F: "floor",
	W: "wall",
	H: "hole",
	S: "start",
	G: "goal",
	U: "teleportUp",
	D: "teleportDown",
	K: "key",
};

// 表の文字で書いた行から迷路を作る（テストを読みやすくするため）
function mazeOf(layers: string[][], startDirection: Direction): Maze {
	return {
		layers: layers.map((rows) =>
			rows.map((row) =>
				row.split("").map((letter) => {
					const cell = LETTERS[letter];
					if (cell === undefined) throw new Error(`表にない文字: ${letter}`);
					return cell;
				}),
			),
		),
		startDirection,
	};
}

// 一辺sizeのすべてゆかの階
function floorRows(size: number): string[] {
	return Array.from({ length: size }, () => "F".repeat(size));
}

// 1階の左上にスタート、いちばん上の階の右下にゴールを置いた迷路
function simpleMaze(size: number, layerCount: number): Maze {
	const layers = Array.from({ length: layerCount }, () => floorRows(size));
	const first = layers[0] ?? [];
	first[0] = `S${"F".repeat(size - 1)}`;
	const top = layers[layerCount - 1] ?? [];
	top[size - 1] = `${"F".repeat(size - 1)}G`;
	return mazeOf(layers, "east");
}

const PREFIX = "KASANE-MAZE:1:";

describe("encodeMazeQr", () => {
	it("仕様書の形式（目印・版・一辺・向き・マス・名前を:でつなぐ）で書き出す", () => {
		const maze = simpleMaze(5, 1);
		const cells = `SFFFF${"FFFFF".repeat(3)}FFFFG`;
		expect(encodeMazeQr("めいろ1", maze)).toBe(`KASANE-MAZE:1:5:E:${cells}:めいろ1`);
	});

	it("8種類のマスを、表の文字に置き換える", () => {
		const maze = mazeOf(
			[
				["SWHKF", "FFFFF", "UFFFF", "FFFFF", "FFFFF"],
				["FFFFF", "FFFFF", "FFFFF", "DFFFF", "FFFFG"],
			],
			"east",
		);
		const cells = "SWHKFFFFFFUFFFFFFFFFFFFFF" + "FFFFFFFFFFFFFFFDFFFFFFFFG";
		expect(encodeMazeQr("a", maze)).toBe(`${PREFIX}5:E:${cells}:a`);
	});

	it.each<[Direction, string]>([
		["north", "N"],
		["east", "E"],
		["south", "S"],
		["west", "W"],
	])("向き%sは%s", (direction, letter) => {
		const maze: Maze = { ...simpleMaze(5, 1), startDirection: direction };
		expect(encodeMazeQr("a", maze).startsWith(`${PREFIX}5:${letter}:`)).toBe(true);
	});

	it("3階×7×7でも200文字ほどに収まる", () => {
		expect(encodeMazeQr("あ".repeat(20), simpleMaze(7, 3)).length).toBeLessThanOrEqual(200);
	});
});

describe("decodeMazeQr（戻せる）", () => {
	it.each([
		[5, 1],
		[5, 2],
		[5, 3],
		[6, 1],
		[6, 2],
		[6, 3],
		[7, 1],
		[7, 2],
		[7, 3],
	])("一辺%i・%i階の迷路が、同じ名前と迷路に戻る", (size, layerCount) => {
		const maze = simpleMaze(size, layerCount);
		expect(decodeMazeQr(encodeMazeQr("めいろ1", maze))).toEqual({
			ok: true,
			name: "めいろ1",
			maze,
		});
	});

	it("8種類のマスと4つの向きが、そのまま戻る", () => {
		for (const startDirection of ["north", "east", "south", "west"] as const) {
			const maze = mazeOf(
				[
					["SWHKF", "FFFFF", "UFFFF", "FFFFF", "FFFFF"],
					["FFFFF", "FFFFF", "FFFFF", "DFFFF", "FFFFG"],
				],
				startDirection,
			);
			expect(decodeMazeQr(encodeMazeQr("めいろ", maze))).toEqual({
				ok: true,
				name: "めいろ",
				maze,
			});
		}
	});

	it("名前に:があっても、5つ目の:より後をすべて名前とする", () => {
		const maze = simpleMaze(5, 1);
		expect(decodeMazeQr(encodeMazeQr("a:b:c", maze))).toEqual({ ok: true, name: "a:b:c", maze });
	});

	it("名前は20文字まで戻せる", () => {
		const name = "あ".repeat(20);
		const maze = simpleMaze(5, 1);
		expect(decodeMazeQr(encodeMazeQr(name, maze))).toEqual({ ok: true, name, maze });
	});

	it("中身の前後の空白は取る", () => {
		const maze = simpleMaze(5, 1);
		expect(decodeMazeQr(` \n${encodeMazeQr("めいろ1", maze)}\n `)).toEqual({
			ok: true,
			name: "めいろ1",
			maze,
		});
	});
});

describe("decodeMazeQr（notMazeQr）", () => {
	it.each([
		["カードの文字列", "FORWARD"],
		["授業QRのURL", "https://student.example.com/join?lesson=0b7e5d1c-1f2a-4c3b-9d8e-7a6b5c4d3e2f"],
		["空", ""],
		["目印が違う", `KASANE-MAZ:1:5:E:${"F".repeat(25)}:a`],
		["目印が小文字", `kasane-maze:1:5:E:${"F".repeat(25)}:a`],
		["版が1でない", `KASANE-MAZE:2:5:E:SFFFF${"F".repeat(19)}G:a`],
		["版のあとに:がない", "KASANE-MAZE:1"],
	])("%s", (_, text) => {
		expect(decodeMazeQr(text)).toEqual({ ok: false, reason: "notMazeQr" });
	});
});

describe("decodeMazeQr（brokenMaze）", () => {
	const cells5 = `SFFFF${"FFFFF".repeat(3)}FFFFG`;

	it.each([
		["一辺が4", `${PREFIX}4:E:S${"F".repeat(14)}G:a`],
		["一辺が8", `${PREFIX}8:E:S${"F".repeat(62)}G:a`],
		["一辺が数でない", `${PREFIX}x:E:${cells5}:a`],
		["向きが4文字のどれでもない", `${PREFIX}5:X:${cells5}:a`],
		["向きが小文字", `${PREFIX}5:e:${cells5}:a`],
		["マスに表にない文字がある", `${PREFIX}5:E:SFFFZ${"FFFFF".repeat(3)}FFFFG:a`],
		["マスが小文字", `${PREFIX}5:E:sffff${"fffff".repeat(3)}ffffg:a`],
		["マスの長さが一辺×一辺の倍数でない", `${PREFIX}5:E:${cells5}F:a`],
		["マスが4階分ある", `${PREFIX}5:E:${cells5}${"F".repeat(75)}:a`],
		["マスが空", `${PREFIX}5:E::a`],
		["名前がない（:が足りない）", `${PREFIX}5:E:${cells5}`],
		["名前が空", `${PREFIX}5:E:${cells5}:`],
		["名前が空白だけ", `${PREFIX}5:E:${cells5}:   `],
		["名前が全角の空白だけ", `${PREFIX}5:E:${cells5}:　`],
		["名前が21文字", `${PREFIX}5:E:${cells5}:${"あ".repeat(21)}`],
		["名前に改行がある", `${PREFIX}5:E:${cells5}:め\nいろ`],
		["名前に制御文字がある", `${PREFIX}5:E:${cells5}:め\u0007いろ`],
		["スタートが2つ（validateMazeを通らない）", `${PREFIX}5:E:SSFFF${"FFFFF".repeat(3)}FFFFG:a`],
		["ゴールがない（validateMazeを通らない）", `${PREFIX}5:E:SFFFF${"FFFFF".repeat(4)}:a`],
		[
			"いちばん上の階に上へのテレポート（validateMazeを通らない）",
			`${PREFIX}5:E:SUFFF${"FFFFF".repeat(3)}FFFFG:a`,
		],
	])("%s", (_, text) => {
		expect(decodeMazeQr(text)).toEqual({ ok: false, reason: "brokenMaze" });
	});
});
