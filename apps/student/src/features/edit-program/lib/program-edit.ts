/*
 * カードの並びの編集（仕様書domain.mdの「カードの並びの編集（児童の端末）」）
 * 児童の端末は、読み取ったカードを木構造（Program）に直接差し込む。どの関数も元のProgramを書き換えず、
 * 変えるbodyとその親だけを複製し、残りは元の命令をそのまま使った新しいProgramを返す
 * 範囲外の位置のような呼び出し側の誤りだけ例外にする
 */
import type { Card, Command, Program } from "@kasane/core";

// 入れる場所。[1, 0]は「2つ目の命令のbodyの先頭」
export type Cursor = number[];

// くりかえすの回数。読み取った直後は2、画面で2〜10に変える
export const INITIAL_REPEAT_TIMES = 2;
export const MIN_REPEAT_TIMES = 2;
export const MAX_REPEAT_TIMES = 10;

type Repeat = Extract<Command, { type: "repeat" }>;

// 読み取ったカードを、入れる命令に直す。同じ種類のカードでも別のカードとして扱うので、毎回新しく作る
function commandOf(card: Card): Command | null {
	switch (card.type) {
		case "forward":
		case "right":
		case "left":
		case "fill":
			return { type: card.type };
		case "repeat":
			return { type: "repeat", times: INITIAL_REPEAT_TIMES, body: [] };
		case "end":
			return null;
	}
}

// bodyの位置（命令の位置の並び）が指すくりかえしのbody。[]は一番外側
function bodyAt(program: Program, bodyPath: readonly number[]): readonly Command[] {
	let body: readonly Command[] = program;
	for (const index of bodyPath) {
		const command = body[index];
		if (command?.type !== "repeat")
			throw new Error(`くりかえしでない位置（${bodyPath.join(",")}）`);
		body = command.body;
	}
	return body;
}

// bodyPathのbodyだけを書き換えた新しいProgramを返す（途中のくりかえしは複製し、他は元のまま使う）
function updateBody(
	commands: readonly Command[],
	bodyPath: readonly number[],
	update: (body: readonly Command[]) => Command[],
): Command[] {
	const [index, ...rest] = bodyPath;
	if (index === undefined) return update(commands);

	const command = commands[index];
	if (command?.type !== "repeat") throw new Error(`くりかえしでない位置（${bodyPath.join(",")}）`);
	const replaced: Repeat = { ...command, body: updateBody(command.body, rest, update) };
	return commands.map((current, position) => (position === index ? replaced : current));
}

// 位置を、それが入っているbodyの位置と、bodyの中の番号に分ける
function split(path: readonly number[]): { bodyPath: number[]; index: number } {
	const index = path.at(-1);
	if (index === undefined) throw new Error("位置が空");
	return { bodyPath: path.slice(0, -1), index };
}

export function isInsideRepeat(cursor: Cursor): boolean {
	return cursor.length > 1;
}

export function insertCard(
	program: Program,
	cursor: Cursor,
	card: Card,
): { program: Program; cursor: Cursor } {
	const { bodyPath, index } = split(cursor);
	const body = bodyAt(program, bodyPath);
	if (!Number.isInteger(index) || index < 0 || index > body.length) {
		throw new Error(`差し込み位置が木構造の外（${cursor.join(",")}）`);
	}

	const command = commandOf(card);
	if (command === null) {
		// くりかえし終わり: 中にいなければ何もしない（画面が文言を出す）。中なら、そのくりかえしの直後に移す
		if (!isInsideRepeat(cursor)) return { program, cursor };
		const repeat = split(bodyPath);
		return { program, cursor: [...repeat.bodyPath, repeat.index + 1] };
	}

	const inserted = updateBody(program, bodyPath, (commands) => [
		...commands.slice(0, index),
		command,
		...commands.slice(index),
	]);
	// くりかえすはそのbodyの先頭へ、他の命令はその直後へ進める
	const next = command.type === "repeat" ? [...bodyPath, index, 0] : [...bodyPath, index + 1];
	return { program: inserted, cursor: next };
}

// 位置にある命令。なければ呼び出し側の誤り
export function commandAt(program: Program, path: readonly number[]): Command {
	const { bodyPath, index } = split(path);
	const command = bodyAt(program, bodyPath)[index];
	if (command === undefined) throw new Error(`命令のない位置（${path.join(",")}）`);
	return command;
}

export function removeCommand(
	program: Program,
	path: number[],
): { program: Program; cursor: Cursor } {
	// 命令のない位置なら、ここで例外になる
	commandAt(program, path);
	const { bodyPath, index } = split(path);
	const removed = updateBody(program, bodyPath, (commands) =>
		commands.filter((_, position) => position !== index),
	);
	return { program: removed, cursor: [...path] };
}

/*
 * 命令を消した後の差し込み位置
 * 消した命令の中にあれば消した場所に移し（removeCommandが返す位置と同じ）、同じbodyの後ろにあれば一つ前にずらす
 */
export function cursorAfterRemove(cursor: Cursor, removed: readonly number[]): Cursor {
	const depth = removed.length - 1;
	const removedIndex = removed[depth];
	const cursorIndex = cursor[depth];
	if (removedIndex === undefined || cursorIndex === undefined) return cursor;
	const sameBody = removed.slice(0, depth).every((index, level) => cursor[level] === index);
	if (!sameBody) return cursor;

	if (cursorIndex === removedIndex && cursor.length > removed.length) return [...removed];
	if (cursorIndex > removedIndex) {
		return cursor.map((index, level) => (level === depth ? index - 1 : index));
	}
	return cursor;
}

export function setRepeatTimes(program: Program, path: number[], times: number): Program {
	if (!Number.isInteger(times) || times < MIN_REPEAT_TIMES || times > MAX_REPEAT_TIMES) {
		throw new Error(`くりかえしの回数が2〜10の外（${times}）`);
	}
	if (commandAt(program, path).type !== "repeat") {
		throw new Error(`くりかえしでない位置（${path.join(",")}）`);
	}
	const { bodyPath, index } = split(path);
	return updateBody(program, bodyPath, (commands) =>
		commands.map((command, position) =>
			position === index && command.type === "repeat" ? { ...command, times } : command,
		),
	);
}

// 木の中の命令の数（くりかえしも1つと数え、bodyの中も数える）
export function countCommands(commands: readonly Command[]): number {
	return commands.reduce(
		(count, command) => count + 1 + (command.type === "repeat" ? countCommands(command.body) : 0),
		0,
	);
}

// 木を上から数えた番号（1始まり）。画面の番号と文言の{n}に使う
export function commandIndex(program: Program, path: number[]): number {
	// 命令のない位置なら、ここで例外になる
	commandAt(program, path);
	let before = 0;
	let body: readonly Command[] = program;
	for (const index of path) {
		before += countCommands(body.slice(0, index)) + 1;
		const command = body[index];
		body = command?.type === "repeat" ? command.body : [];
	}
	return before;
}

// 木を上から数えて一番最後のカードの位置。「最後のカードを消す」で消す。カードがなければnull
export function lastCommandPath(program: Program): number[] | null {
	const index = program.length - 1;
	const last = program[index];
	if (last === undefined) return null;
	if (last.type !== "repeat") return [index];

	const inner = lastCommandPath(last.body);
	return inner === null ? [index] : [index, ...inner];
}
