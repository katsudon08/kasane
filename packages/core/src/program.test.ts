import { describe, expect, test } from "bun:test";

import type { Command, Program } from "./program";
import { MAX_COMMANDS, MAX_REPEAT_DEPTH, validateProgram } from "./program";

const forward: Command = { type: "forward" };

function forwards(count: number): Command[] {
	return Array.from({ length: count }, () => forward);
}

function repeat(times: number, body: Command[]): Command {
	return { type: "repeat", times, body };
}

describe("validateProgram", () => {
	test("上限はMAX_COMMANDSが100、MAX_REPEAT_DEPTHが3", () => {
		expect(MAX_COMMANDS).toBe(100);
		expect(MAX_REPEAT_DEPTH).toBe(3);
	});

	test("空のプログラムは通る", () => {
		expect(validateProgram([], null)).toEqual({ ok: true });
	});

	describe("木構造の命令の数がMAX_COMMANDS（100）より多い", () => {
		test("100個なら通る", () => {
			expect(validateProgram(forwards(100), null)).toEqual({ ok: true });
		});

		test("101個ならtooManyCommands", () => {
			expect(validateProgram(forwards(101), null)).toEqual({
				ok: false,
				reason: { kind: "tooManyCommands", limit: 100 },
			});
		});

		test("repeatも1つと数え、bodyの中も数える", () => {
			// repeat 1つ＋bodyの99個＝100個
			expect(validateProgram([repeat(2, forwards(99))], null)).toEqual({ ok: true });
			// repeat 1つ＋bodyの100個＝101個
			expect(validateProgram([repeat(2, forwards(100))], null)).toEqual({
				ok: false,
				reason: { kind: "tooManyCommands", limit: 100 },
			});
		});
	});

	describe("問題の上限枚数（maxCards）より多い", () => {
		// 命令3つ＋くりかえし終わり1枚＝4枚
		const program: Program = [repeat(2, forwards(2))];

		test("枚数は命令の数にrepeatの数を足したもの", () => {
			expect(validateProgram(program, 4)).toEqual({ ok: true });
			expect(validateProgram(program, 3)).toEqual({
				ok: false,
				reason: { kind: "tooManyCards", limit: 3 },
			});
		});

		test("入れ子のrepeatも1枚ずつ足す", () => {
			// 命令4つ（repeat・repeat・forward・forward）＋くりかえし終わり2枚＝6枚
			const nested: Program = [repeat(2, [repeat(2, forwards(2))])];
			expect(validateProgram(nested, 6)).toEqual({ ok: true });
			expect(validateProgram(nested, 5)).toEqual({
				ok: false,
				reason: { kind: "tooManyCards", limit: 5 },
			});
		});

		test("maxCardsがnullなら上限なし", () => {
			expect(validateProgram(forwards(100), null)).toEqual({ ok: true });
		});

		test("maxCardsとちょうど同じ枚数なら通る", () => {
			expect(validateProgram(forwards(7), 7)).toEqual({ ok: true });
		});
	});

	describe("くりかえしの入れ子がMAX_REPEAT_DEPTH（3）より深い", () => {
		test("3段なら通る", () => {
			const program: Program = [repeat(2, [repeat(2, [repeat(2, forwards(1))])])];
			expect(validateProgram(program, null)).toEqual({ ok: true });
		});

		test("4段ならtooDeep", () => {
			const program: Program = [repeat(2, [repeat(2, [repeat(2, [repeat(2, forwards(1))])])])];
			expect(validateProgram(program, null)).toEqual({
				ok: false,
				reason: { kind: "tooDeep", limit: 3 },
			});
		});

		test("並んだrepeatは深さに数えない", () => {
			const program: Program = [
				repeat(2, forwards(1)),
				repeat(2, forwards(1)),
				repeat(2, forwards(1)),
				repeat(2, forwards(1)),
			];
			expect(validateProgram(program, null)).toEqual({ ok: true });
		});
	});

	test("表の順に確かめ、命令の数が多ければ枚数より先にtooManyCommands", () => {
		expect(validateProgram(forwards(101), 5)).toEqual({
			ok: false,
			reason: { kind: "tooManyCommands", limit: 100 },
		});
	});

	test("枚数の上限と入れ子の深さの両方を超えたら、枚数が先", () => {
		const program: Program = [repeat(2, [repeat(2, [repeat(2, [repeat(2, forwards(1))])])])];
		expect(validateProgram(program, 3)).toEqual({
			ok: false,
			reason: { kind: "tooManyCards", limit: 3 },
		});
	});

	test("timesの範囲はここでは見ない", () => {
		expect(validateProgram([repeat(11, forwards(1))], null)).toEqual({ ok: true });
	});
});
