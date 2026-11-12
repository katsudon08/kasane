/*
 * 問題を飛ばす先として選べるもの（仕様書README.mdの「問題を飛ばす」、backend.mdのPOST /me/tutorials/skip）
 * 選べるのは、今の問題（クリア数＋1）より後の問題と、全部飛ばす（チュートリアルの数＋1）
 * toはその問題から始めるという意味で、送るとto - 1問目までをクリアしたことにする
 */
import { TUTORIALS } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { ALL_SKIPPED, skipTargets } from "./skip-targets";

describe("skipTargets", () => {
	it("全部飛ばすは、チュートリアルの数＋1", () => {
		expect(ALL_SKIPPED).toBe(TUTORIALS.length + 1);
	});

	it("一つもクリアしていなければ、2問目から全部飛ばすまで", () => {
		expect(skipTargets(0)).toEqual([2, 3, 4, 5, 6, 7, ALL_SKIPPED]);
	});

	it("3問目までクリアしていれば、今の問題（4問目）より後だけ", () => {
		expect(skipTargets(3)).toEqual([5, 6, 7, ALL_SKIPPED]);
	});

	it("最後の問題が今の問題なら、全部飛ばすだけ", () => {
		expect(skipTargets(TUTORIALS.length - 1)).toEqual([ALL_SKIPPED]);
	});

	it("全部クリアしていれば、選べるものはない", () => {
		expect(skipTargets(TUTORIALS.length)).toEqual([]);
	});
});
