/*
 * カードの並びの編集（仕様書domain.mdの「カードの並びの編集（児童の端末）」）
 * 表の操作ごとに、木構造と差し込み位置がどう変わるかを確かめる。どの関数も元のProgramを書き換えない
 */
import type { Card, Command, Program } from "@kasane/core";
import { describe, expect, it } from "vitest";

import {
	commandIndex,
	cursorAfterRemove,
	insertCard,
	isInsideRepeat,
	lastCommandPath,
	removeCommand,
	setRepeatTimes,
} from "./program-edit";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const left: Command = { type: "left" };
const fill: Command = { type: "fill" };

function repeat(times: number, body: Command[]): Command {
	return { type: "repeat", times, body };
}

function card(type: Card["type"]): Card {
	return { type };
}

describe("insertCard", () => {
	describe("前・右・左・うめるを読み取ったら、差し込み位置に入れて、その直後に進める", () => {
		it.each([
			{ type: "forward", command: forward },
			{ type: "right", command: right },
			{ type: "left", command: left },
			{ type: "fill", command: fill },
		] as const)("$typeを一番外側の末尾に入れる", ({ type, command }) => {
			const result = insertCard([forward], [1], card(type));

			expect(result.program).toEqual([forward, command]);
			expect(result.cursor).toEqual([2]);
		});

		it("空の並びの先頭に入れる（差し込み位置は最初は一番外側の末尾）", () => {
			const result = insertCard([], [0], card("forward"));

			expect(result.program).toEqual([forward]);
			expect(result.cursor).toEqual([1]);
		});

		it("並びの途中に入れると、後ろの命令は一つずれる", () => {
			const result = insertCard([forward, left], [1], card("right"));

			expect(result.program).toEqual([forward, right, left]);
			expect(result.cursor).toEqual([2]);
		});

		it("くりかえしのbodyの中に入れる", () => {
			const result = insertCard([forward, repeat(3, [forward])], [1, 1], card("right"));

			expect(result.program).toEqual([forward, repeat(3, [forward, right])]);
			expect(result.cursor).toEqual([1, 2]);
		});

		it("入れ子のくりかえしの中に入れる", () => {
			const result = insertCard([repeat(2, [repeat(3, [])])], [0, 0, 0], card("fill"));

			expect(result.program).toEqual([repeat(2, [repeat(3, [fill])])]);
			expect(result.cursor).toEqual([0, 0, 1]);
		});
	});

	describe("くりかえすを読み取ったら、回数2の空のくりかえしを入れて、そのbodyの先頭に移す", () => {
		it("一番外側に入れる", () => {
			const result = insertCard([forward], [1], card("repeat"));

			expect(result.program).toEqual([forward, repeat(2, [])]);
			expect(result.cursor).toEqual([1, 0]);
		});

		it("くりかえしの中に入れる", () => {
			const result = insertCard([repeat(4, [forward])], [0, 0], card("repeat"));

			expect(result.program).toEqual([repeat(4, [repeat(2, []), forward])]);
			expect(result.cursor).toEqual([0, 0, 0]);
		});
	});

	describe("くりかえし終わりを読み取ったら", () => {
		it("差し込み位置がくりかえしのbodyの中なら、そのくりかえしの直後に移す（木構造は変わらない）", () => {
			const program = [forward, repeat(2, [right])];
			const result = insertCard(program, [1, 1], card("end"));

			expect(result.program).toBe(program);
			expect(result.cursor).toEqual([2]);
		});

		it("bodyの途中にあっても、くりかえしの直後に移す", () => {
			const program = [repeat(2, [right, left]), forward];
			const result = insertCard(program, [0, 1], card("end"));

			expect(result.cursor).toEqual([1]);
		});

		it("入れ子なら、一つ外のくりかえしの中に出る", () => {
			const program = [repeat(2, [repeat(3, [fill])])];
			const result = insertCard(program, [0, 0, 1], card("end"));

			expect(result.cursor).toEqual([0, 1]);
		});

		it("中でなければ何もしない（画面はendOutsideRepeatの文言を出す）", () => {
			const program = [forward];
			const result = insertCard(program, [1], card("end"));

			expect(result.program).toBe(program);
			expect(result.cursor).toEqual([1]);
		});
	});

	it("差し込み位置が木構造の外なら、呼び出し側の誤りとして例外にする", () => {
		expect(() => insertCard([forward], [3], card("forward"))).toThrow();
		expect(() => insertCard([forward], [0, 0], card("forward"))).toThrow();
		expect(() => insertCard([forward], [], card("forward"))).toThrow();
	});

	it("元のProgramを書き換えず、変えていない部分は元の命令をそのまま使う", () => {
		const untouched = repeat(2, [left]);
		const program = [untouched, repeat(3, [forward])];
		const before = structuredClone(program);

		const result = insertCard(program, [1, 1], card("right"));

		expect(program).toEqual(before);
		expect(result.program).not.toBe(program);
		expect(result.program[0]).toBe(untouched);
	});

	it("入れた命令は、毎回新しいオブジェクトにする（同じ種類のカードでも別のカードとして扱う）", () => {
		const first = insertCard([], [0], card("forward"));
		const second = insertCard(first.program, first.cursor, card("forward"));

		expect(second.program[0]).not.toBe(second.program[1]);
	});
});

describe("isInsideRepeat", () => {
	it.each([
		{ cursor: [0], expected: false },
		{ cursor: [3], expected: false },
		{ cursor: [1, 0], expected: true },
		{ cursor: [0, 2, 1], expected: true },
	])("差し込み位置が$cursorなら$expected", ({ cursor, expected }) => {
		expect(isInsideRepeat(cursor)).toBe(expected);
	});
});

describe("removeCommand", () => {
	it("その命令を消し、消した場所を差し込み位置として返す", () => {
		const result = removeCommand([forward, right, left], [1]);

		expect(result.program).toEqual([forward, left]);
		expect(result.cursor).toEqual([1]);
	});

	it("くりかえしを消すと、bodyごと消える", () => {
		const result = removeCommand([forward, repeat(2, [right, repeat(3, [fill])]), left], [1]);

		expect(result.program).toEqual([forward, left]);
		expect(result.cursor).toEqual([1]);
	});

	it("くりかえしの中の命令を消す", () => {
		const result = removeCommand([repeat(2, [right, left])], [0, 0]);

		expect(result.program).toEqual([repeat(2, [left])]);
		expect(result.cursor).toEqual([0, 0]);
	});

	it("命令のない位置なら、呼び出し側の誤りとして例外にする", () => {
		expect(() => removeCommand([forward], [1])).toThrow();
		expect(() => removeCommand([forward], [0, 0])).toThrow();
		expect(() => removeCommand([forward], [])).toThrow();
	});

	it("元のProgramを書き換えない", () => {
		const program = [repeat(2, [right, left]), forward];
		const before = structuredClone(program);

		removeCommand(program, [0, 1]);

		expect(program).toEqual(before);
	});
});

describe("cursorAfterRemove", () => {
	it.each([
		// 差し込み位置が消した命令の中にあれば、消した場所に移す
		{ cursor: [1, 0], removed: [1], expected: [1] },
		{ cursor: [1, 2, 1], removed: [1], expected: [1] },
		{ cursor: [0, 1, 0], removed: [0, 1], expected: [0, 1] },
		// 同じbodyの後ろにあれば、消した分だけ前にずれる
		{ cursor: [3], removed: [1], expected: [2] },
		{ cursor: [3, 0], removed: [1], expected: [2, 0] },
		{ cursor: [0, 2], removed: [0, 0], expected: [0, 1] },
		// 消した命令の前、または別のbodyにあれば変わらない
		{ cursor: [1], removed: [1], expected: [1] },
		{ cursor: [0], removed: [2], expected: [0] },
		{ cursor: [2, 1], removed: [0, 0], expected: [2, 1] },
		{ cursor: [1], removed: [0, 0], expected: [1] },
	])("差し込み位置$cursorで$removedを消すと$expected", ({ cursor, removed, expected }) => {
		expect(cursorAfterRemove(cursor, removed)).toEqual(expected);
	});
});

describe("setRepeatTimes", () => {
	it.each([2, 5, 10])("回数を%iにする", (times) => {
		const program = [forward, repeat(2, [right])];

		expect(setRepeatTimes(program, [1], times)).toEqual([forward, repeat(times, [right])]);
	});

	it("入れ子のくりかえしの回数を変える", () => {
		const program = [repeat(2, [repeat(3, [fill])])];

		expect(setRepeatTimes(program, [0, 0], 7)).toEqual([repeat(2, [repeat(7, [fill])])]);
	});

	it.each([1, 11, 2.5])("2〜10の外（%s）は、呼び出し側の誤りとして例外にする", (times) => {
		expect(() => setRepeatTimes([repeat(2, [])], [0], times)).toThrow();
	});

	it("くりかえしでない命令は、呼び出し側の誤りとして例外にする", () => {
		expect(() => setRepeatTimes([forward], [0], 3)).toThrow();
		expect(() => setRepeatTimes([forward], [1], 3)).toThrow();
	});

	it("元のProgramを書き換えない", () => {
		const program = [repeat(2, [right])];
		const before = structuredClone(program);

		setRepeatTimes(program, [0], 9);

		expect(program).toEqual(before);
	});
});

describe("commandIndex", () => {
	// 1 前、2 くりかえす［3 右、4 くりかえす［5 うめる］、6 左］、7 前
	const program: Program = [forward, repeat(2, [right, repeat(3, [fill]), left]), forward];

	it.each([
		{ path: [0], expected: 1 },
		{ path: [1], expected: 2 },
		{ path: [1, 0], expected: 3 },
		{ path: [1, 1], expected: 4 },
		{ path: [1, 1, 0], expected: 5 },
		{ path: [1, 2], expected: 6 },
		{ path: [2], expected: 7 },
	])("木を上から数えて、$pathは$expected番目", ({ path, expected }) => {
		expect(commandIndex(program, path)).toBe(expected);
	});

	it("命令のない位置なら、呼び出し側の誤りとして例外にする", () => {
		expect(() => commandIndex(program, [3])).toThrow();
		expect(() => commandIndex(program, [0, 0])).toThrow();
	});
});

describe("lastCommandPath（「最後のカードを消す」で消すカード）", () => {
	it.each([
		{ program: [], expected: null },
		{ program: [forward, right], expected: [1] },
		{ program: [forward, repeat(2, [right, left])], expected: [1, 1] },
		{ program: [repeat(2, [repeat(3, [fill])])], expected: [0, 0, 0] },
		{ program: [forward, repeat(2, [])], expected: [1] },
	] as { program: Program; expected: number[] | null }[])(
		"木を上から数えて一番最後のカード（$expected）",
		({ program, expected }) => {
			expect(lastCommandPath(program)).toEqual(expected);
		},
	);
});
