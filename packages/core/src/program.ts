/*
 * プログラムの型・プログラムの正しさ（仕様書domain.mdの「プログラム」）
 */

export type Command =
	| { type: "forward" }
	| { type: "right" }
	| { type: "left" }
	| { type: "fill" }
	| { type: "repeat"; times: number; body: Command[] };

export type Program = Command[];

// 木構造のすべてのCommandの数の上限。compileの200ターンの上限とは別の、受け付ける本文の大きさの上限
export const MAX_COMMANDS = 100;
// くりかえしの入れ子の深さの上限。対象が小学校の中学年から高学年で、深い入れ子を教える意図がないため
export const MAX_REPEAT_DEPTH = 3;

export type ProgramError =
	| { kind: "tooManyCommands"; limit: number }
	| { kind: "tooManyCards"; limit: number }
	| { kind: "tooDeep"; limit: number };

export type ValidateProgramResult = { ok: true } | { ok: false; reason: ProgramError };

type ProgramSize = { commands: number; repeats: number; depth: number };

function measure(commands: readonly Command[], depth: number): ProgramSize {
	let size: ProgramSize = { commands: 0, repeats: 0, depth };
	for (const command of commands) {
		size = { ...size, commands: size.commands + 1 };
		if (command.type !== "repeat") continue;
		const inner = measure(command.body, depth + 1);
		size = {
			commands: size.commands + inner.commands,
			repeats: size.repeats + 1 + inner.repeats,
			depth: Math.max(size.depth, inner.depth),
		};
	}
	return size;
}

/*
 * 木構造の大きさを確かめる。maxCardsは問題の枚数の上限で、上限のないチュートリアルと自分の迷路はnull
 * timesの範囲（2〜10）は型の検証（TypeBox）で見るので、ここでは見ない
 */
export function validateProgram(program: Program, maxCards: number | null): ValidateProgramResult {
	const size = measure(program, 0);
	if (size.commands > MAX_COMMANDS) {
		return { ok: false, reason: { kind: "tooManyCommands", limit: MAX_COMMANDS } };
	}
	// カードの枚数は、命令の数に「くりかえし終わり」の分（repeatの数）を足したもの
	if (maxCards !== null && size.commands + size.repeats > maxCards) {
		return { ok: false, reason: { kind: "tooManyCards", limit: maxCards } };
	}
	if (size.depth > MAX_REPEAT_DEPTH) {
		return { ok: false, reason: { kind: "tooDeep", limit: MAX_REPEAT_DEPTH } };
	}
	return { ok: true };
}
