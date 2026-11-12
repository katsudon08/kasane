/*
 * カードの並びの表示の行（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」、domain.mdの「カードの並びの編集」）
 * - 木構造をそのまま表示し、くりかえしの中の命令は字下げする
 * - カードの左端の番号は、木を上から数えた順（1始まり）
 * - カードの下の出っ張りは、そのカードの直後（同じbodyの中）。くりかえしのbodyの末尾にも出っ張りがある
 * - くりかえしのカードをタップすると中を開いたり閉じたりできる。動かしている間は、今のカードが閉じたくりかえしの中なら自動で開く
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

// 比べやすいように、行を短い形にする
function outline(rows: ProgramRow[]): string[] {
	return rows.map((row) =>
		row.kind === "card"
			? `${"  ".repeat(row.depth)}${row.number}:${row.command.type}@${row.path.join(",")}` +
				(row.command.type === "repeat" ? (row.open ? "[open]" : "[closed]") : "") +
				(row.slot === null ? "" : `>${row.slot.join(",")}`)
			: `${"  ".repeat(row.depth)}slot>${row.cursor.join(",")}`,
	);
}

describe("programRows", () => {
	it("カードがないときは、一番外側の先頭の差し込み位置だけを出す", () => {
		expect(
			outline(programRows([], { collapsed: NOTHING_CLOSED, cursor: [0], current: null })),
		).toEqual(["slot>0"]);
	});

	it("並んだカードは、番号と、直後を指す出っ張りを持つ", () => {
		const program: Program = [forward, right, fill];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [3], current: null })),
		).toEqual(["1:forward@0>1", "2:right@1>2", "3:fill@2>3"]);
	});

	it("差し込み位置が一番外側の先頭なら、先頭にも差し込み位置を出す", () => {
		const program: Program = [forward, right];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [0], current: null })),
		).toEqual(["slot>0", "1:forward@0>1", "2:right@1>2"]);
	});

	it("開いたくりかえしは、中を字下げして並べ、bodyの後にくりかえしの直後を指す出っ張りを出す", () => {
		// 1 前、2 くりかえす［3 右、4 くりかえす［5 うめる］］、6 前
		const program: Program = [forward, repeat(2, [right, repeat(3, [fill])]), forward];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [3], current: null })),
		).toEqual([
			"1:forward@0>1",
			"2:repeat@1[open]",
			"  3:right@1,0>1,1",
			"  4:repeat@1,1[open]",
			"    5:fill@1,1,0>1,1,1",
			"  slot>1,2",
			"slot>2",
			"6:forward@2>3",
		]);
	});

	it("中が空のくりかえしは、bodyの末尾（先頭）の出っ張りを出す", () => {
		const program: Program = [forward, repeat(2, [])];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [1, 0], current: null })),
		).toEqual(["1:forward@0>1", "2:repeat@1[open]", "  slot>1,0", "slot>2"]);
	});

	it("差し込み位置がbodyの先頭で、中にカードがあれば、先頭にも差し込み位置を出す", () => {
		const program: Program = [repeat(2, [right, fill])];

		expect(
			outline(programRows(program, { collapsed: NOTHING_CLOSED, cursor: [0, 0], current: null })),
		).toEqual([
			"1:repeat@0[open]",
			"  slot>0,0",
			"  2:right@0,0>0,1",
			"  3:fill@0,1>0,2",
			"slot>1",
		]);
	});

	it("閉じたくりかえしは中を出さず、出っ張りはくりかえしの直後を指す。番号は中のカードも数える", () => {
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
			"1:repeat@0[open]",
			"  2:right@0,0>0,1",
			"  3:repeat@0,1[open]",
			"    4:fill@0,1,0>0,1,1",
			"  slot>0,2",
			"slot>1",
		]);
	});

	it("差し込み位置が閉じたくりかえしの中なら、そのくりかえしは開いて出す", () => {
		const closed = repeat(2, [right]);

		expect(
			outline(
				programRows([closed], { collapsed: new Set([closed]), cursor: [0, 1], current: null }),
			),
		).toEqual(["1:repeat@0[open]", "  2:right@0,0>0,1", "slot>1"]);
	});
});
