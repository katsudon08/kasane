/*
 * カードの並びを、画面に上から並べる行にする（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」）
 * - 1枚が1つの命令。くりかえしの中の命令は字下げする（depth）
 * - 番号は木を上から数えた順（1始まり）。閉じたくりかえしの中のカードも数える
 * - 開いているくりかえしの中の命令の下に、「くりかえし終わり」の行を出す
 * - どの行も、押したときの差し込み位置（cursor）を持つ。差し込み位置の青い線は、cursorが今の差し込み位置と同じ行の下に引く
 *   - カード: その直後。開いているくりかえしのカードは、その中の先頭
 *   - 「くりかえし終わり」: くりかえしの直後
 * - 一番外側の先頭を指す行はないので、差し込み位置がそこにあるとき（カードがないとき・消した後など）だけ、先頭の行を出す
 */
import type { Command, Program } from "@kasane/core";

import { countCommands } from "./program-edit";
import type { Cursor } from "./program-edit";

export type ProgramRow =
	| {
			kind: "card";
			command: Command;
			path: number[];
			number: number;
			depth: number;
			// くりかえしの中を開いているか（くりかえし以外はfalse）
			open: boolean;
			cursor: Cursor;
	  }
	// 開いているくりかえしの「くりかえし終わり」。pathはくりかえしの位置
	| { kind: "end"; path: number[]; depth: number; cursor: Cursor }
	// 一番外側の先頭
	| { kind: "head"; depth: 0; cursor: Cursor };

type Options = {
	// 閉じているくりかえし（命令のオブジェクトで覚える）
	collapsed: ReadonlySet<Command>;
	cursor: Cursor;
	// 動かしている間の今のカード。なければnull
	current: number[] | null;
};

function startsWith(path: readonly number[], prefix: readonly number[]): boolean {
	return path.length > prefix.length && prefix.every((index, level) => path[level] === index);
}

function samePath(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((index, level) => b[level] === index);
}

export function programRows(program: Program, options: Options): ProgramRow[] {
	const rows: ProgramRow[] = [];
	let number = 0;

	const isOpen = (command: Command, path: number[]) =>
		!options.collapsed.has(command) ||
		startsWith(options.cursor, path) ||
		(options.current !== null && startsWith(options.current, path));

	const addBody = (body: readonly Command[], bodyPath: number[], depth: number) => {
		body.forEach((command, index) => {
			number += 1;
			const path = [...bodyPath, index];
			const after = [...bodyPath, index + 1];
			if (command.type !== "repeat") {
				rows.push({ kind: "card", command, path, number, depth, open: false, cursor: after });
				return;
			}
			if (!isOpen(command, path)) {
				rows.push({ kind: "card", command, path, number, depth, open: false, cursor: after });
				number += countCommands(command.body);
				return;
			}
			rows.push({ kind: "card", command, path, number, depth, open: true, cursor: [...path, 0] });
			addBody(command.body, path, depth + 1);
			rows.push({ kind: "end", path, depth, cursor: after });
		});
	};

	if (program.length === 0 || samePath(options.cursor, [0])) {
		rows.push({ kind: "head", depth: 0, cursor: [0] });
	}
	addBody(program, [], 0);
	return rows;
}
