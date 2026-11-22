/*
 * 自由モードのクリア数（仕様書free-mode.mdの「記録」）
 * localStorageには、クリア数をJSONの数として保存する
 */
import { TUTORIALS } from "@kasane/core";

import { parseStored } from "./parse-stored";

// クリア数を変える操作。失敗したときと自分の迷路で遊んだときは変わらないので、ここには入れない
export type ClearedChange =
	| { kind: "goal"; no: number }
	| { kind: "skip"; to: number }
	| { kind: "reset" };

// 仕様書の「クリア数の変わり方」の表
export function nextClearedCount(current: number, change: ClearedChange): number {
	switch (change.kind) {
		case "goal":
			return Math.max(current, change.no);
		case "skip":
			return Math.max(current, change.to - 1);
		case "reset":
			return 0;
	}
}

// 0〜チュートリアルの数の整数でなければ、0として扱う
export function readClearedCount(stored: string | null): number {
	const value = parseStored(stored);
	if (typeof value !== "number" || !Number.isInteger(value)) return 0;
	if (value < 0 || value > TUTORIALS.length) return 0;
	return value;
}
