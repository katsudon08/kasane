/*
 * カードの並びの表示の行（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」、domain.mdの「カードの並びの編集」）
 * - 木構造をそのまま表示し、くりかえしの中の命令は字下げする
 * - カードの左端の番号は、木を上から数えた順（1始まり）
 * - 開いているくりかえしの中の命令の下に、「くりかえし終わり」の行を出す
 * - カードを押すと、そのカードの直後が差し込み位置になる。開いているくりかえしのカードはその中の先頭、
 *   「くりかえし終わり」の行はくりかえしの直後
 * - くりかえしの中は開閉ボタンで開いたり閉じたりできる。動かしている間は、今のカードが閉じたくりかえしの中なら自動で開く
 */
import type { Command, Program } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { programRows } from "./program-rows";
import type { ProgramRow } from "./program-rows";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const fill: Command = { type: "fill" };

function repeat(times: number, body: Command[]): Command {
	return { type: "repeat", times, body };
}

const NOTHING_CLOSED: ReadonlySet<Command> = new Set();

// 比べやすいように、行を短い形にする。「>」の後ろは、押したときの差し込み位置
function outline(rows: ProgramRow[]): string[] {
	return rows.map((row) => {
		const indent = "  ".repeat(row.depth);
		const cursor = `>${row.cursor.join(",")}`;
		if (row.kind === "head") return `${indent}head${cursor}`;
		if (row.kind === "end") return `${indent}end@${row.path.join(",")}${cursor}`;
		const state = row.command.type === "repeat" ? (row.open ? "[open]" : "[closed]") : "";
		return `${indent}${row.number}:${row.command.type}@${row.path.join(",")}${state}${cursor}`;
	});
}

describe("programRows", () => {
	it("カードがないときは、一番外側の先頭の行だけを出す", () => {
		expect(
			outline(programRows([], { collapsed: NOTHING_CLOSED, cursor: [0], current: null })),
		).toEqual(["head>0"]);
	});

	it("並んだカードは、番号を持ち、押すとその直後が差し込み位置になる", () => {
		const program: Program = [forward, right, fill];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [3], current: null })),
		).toEqual(["1:forward@0>1", "2:right@1>2", "3:fill@2>3"]);
	});

	it("差し込み位置が一番外側の先頭なら、先頭の行も出す", () => {
		const program: Program = [forward, right];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [0], current: null })),
		).toEqual(["head>0", "1:forward@0>1", "2:right@1>2"]);
	});

	it("開いたくりかえしは、中を字下げして並べ、その下に「くりかえし終わり」の行を出す", () => {
		// 1 前、2 くりかえす［3 右、4 くりかえす［5 うめる］］、6 前
		const program: Program = [forward, repeat(2, [right, repeat(3, [fill])]), forward];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [3], current: null })),
		).toEqual([
			"1:forward@0>1",
			"2:repeat@1[open]>1,0",
			"  3:right@1,0>1,1",
			"  4:repeat@1,1[open]>1,1,0",
			"    5:fill@1,1,0>1,1,1",
			"  end@1,1>1,2",
			"end@1>2",
			"6:forward@2>3",
		]);
	});

	it("中が空のくりかえしも、カードを押すとその中に入れられ、「くりかえし終わり」を押すと直後に入れられる", () => {
		const program: Program = [forward, repeat(2, [])];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [1, 0], current: null })),
		).toEqual(["1:forward@0>1", "2:repeat@1[open]>1,0", "end@1>2"]);
	});

	it("押したときの差し込み位置は、行ごとにすべて違う（一つの差し込み位置を二つの行で示さない）", () => {
		const program: Program = [repeat(2, [right, repeat(3, [fill]), repeat(2, [])]), forward];
		const rows = programRows(program, { collapsed: NOTHING_CLOSED, cursor: [2], current: null });
		const cursors = rows.map((row) => row.cursor.join(","));

		expect(new Set(cursors).size).toBe(cursors.length);
	});

	it("閉じたくりかえしは中と「くりかえし終わり」を出さず、押すとくりかえしの直後になる。番号は中のカードも数える", () => {
		const closed = repeat(2, [right, fill]);
		const program: Program = [closed, forward];

		expect(
			outline(programRows(program, { collapsed: new Set([closed]), cursor: [2], current: null })),
		).toEqual(["1:repeat@0[closed]>1", "4:forward@1>2"]);
	});

	it("今のカードが閉じたくりかえしの中なら、自動で開く", () => {
		const inner = repeat(3, [fill]);
		const outer = repeat(2, [right, inner]);
		const program: Program = [outer];

		expect(
			outline(
				programRows(program, {
					collapsed: new Set([outer, inner]),
					cursor: [1],
					current: [0, 1, 0],
				}),
			),
		).toEqual([
			"1:repeat@0[open]>0,0",
			"  2:right@0,0>0,1",
			"  3:repeat@0,1[open]>0,1,0",
			"    4:fill@0,1,0>0,1,1",
			"  end@0,1>0,2",
			"end@0>1",
		]);
	});

	it("差し込み位置が閉じたくりかえしの中なら、そのくりかえしは開いて出す", () => {
		const closed = repeat(2, [right]);

		expect(
			outline(
				programRows([closed], { collapsed: new Set([closed]), cursor: [0, 1], current: null }),
			),
		).toEqual(["1:repeat@0[open]>0,0", "  2:right@0,0>0,1", "end@0>1"]);
	});
});
