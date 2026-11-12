/*
 * カードの並びを、画面に上から並べる行にする（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」）
 * - 1枚が1つの命令。くりかえしの中の命令は字下げする（depth）
 * - 番号は木を上から数えた順（1始まり）。閉じたくりかえしの中のカードも数える
 * - 出っ張り（slot）は、そのカードの直後を指す差し込み位置。開いたくりかえしの出っ張りは、bodyの下に置く
 * - 同じ差し込み位置を二つの出っ張りで出さない。bodyの末尾は、最後のカードの出っ張りがそこを指すので、bodyが空のときだけ出す
 * - bodyの先頭を指す出っ張りはないので、差し込み位置がそこにあるとき（消した後など）だけ、先頭に差し込み位置を出す
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
			// カードの下の出っ張りが指す差し込み位置。開いたくりかえしはbodyの下に別の行で出すのでnull
			slot: Cursor | null;
	  }
	| { kind: "slot"; cursor: Cursor; depth: number };

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
		const head = [...bodyPath, 0];
		if (body.length === 0 || samePath(options.cursor, head)) {
			rows.push({ kind: "slot", cursor: head, depth });
		}

		body.forEach((command, index) => {
			number += 1;
			const path = [...bodyPath, index];
			const after = [...bodyPath, index + 1];
			if (command.type !== "repeat") {
				rows.push({ kind: "card", command, path, number, depth, open: false, slot: after });
				return;
			}
			if (!isOpen(command, path)) {
				rows.push({ kind: "card", command, path, number, depth, open: false, slot: after });
				number += countCommands(command.body);
				return;
			}
			rows.push({ kind: "card", command, path, number, depth, open: true, slot: null });
			addBody(command.body, path, depth + 1);
			rows.push({ kind: "slot", cursor: after, depth });
		});
	};

	addBody(program, [], 0);
	return rows;
}
