/*
 * 問題を飛ばす先として選べるもの（仕様書README.mdの「問題を飛ばす」、backend.mdのPOST /me/tutorials/skip）
 * toはその問題から始めるという意味で、送るとto - 1問目までをクリアしたことにする
 */
import { TUTORIALS } from "@kasane/core";

// 全部の問題を飛ばすときのto
export const ALL_SKIPPED = TUTORIALS.length + 1;

// 今の問題（クリア数＋1）より後の問題と、全部飛ばす。全部クリアしていれば空
export function skipTargets(clearedCount: number): number[] {
	const first = clearedCount + 2;
	return Array.from({ length: Math.max(0, ALL_SKIPPED - first + 1) }, (_, index) => first + index);
}
