/*
 * プレイ画面の状態（仕様書README.mdの「プレイ」、domain.mdの「カードの並びの編集」「プログラムの正しさ」）
 * カードの並びはこの画面のuseReducerで持つ（backend.mdの「フロントエンド共通」）
 * - run === null: 「プログラムをつくる」。読み取ったカードを差し込み位置に入れる
 * - run !== null: 「ロボットを動かす」。カードの読み取りと差し込みはできない
 *   - sending: 送って結果を待つ間（ロボットが準備する短い動きを見せる）
 *   - running: stepsを1ターンずつなぞる。turnは終わったターンの数
 *   - done: 結果を出している。「プログラムを直す」でだけ「つくる」へ戻る
 */
import { validateProgram } from "@kasane/core";
import type { Card, Command, CompileResult, Program, ProgramError } from "@kasane/core";

import {
	commandAt,
	cursorAfterRemove,
	insertCard,
	isInsideRepeat,
	lastCommandPath,
	removeCommand,
	setRepeatTimes,
} from "../../../features/edit-program";
import type { Cursor } from "../../../features/edit-program";

// 「つくる」の間に出す文言
export type Notice =
	| { kind: "programError"; error: ProgramError }
	| { kind: "endOutsideRepeat" }
	| { kind: "offline" };

/*
 * 動かし方
 * - playing: 続けて動かす
 * - pausing: 一時停止を押した。今のターンの動きを終えたら止まる
 * - paused: 止まっている。前にもどる・次に進むが押せる
 * - stepping: 次に進むを押した。1ターン分を動かしたらまた止まる
 */
export type Playback = "playing" | "pausing" | "paused" | "stepping";

export type Run =
	| { phase: "sending" }
	| { phase: "running"; result: CompileResult; turn: number; playback: Playback }
	| { phase: "done"; result: CompileResult };

export type PlayState = {
	// 問題の上限枚数。上限のない問題と自分の迷路はnull
	maxCards: number | null;
	program: Program;
	cursor: Cursor;
	// 閉じているくりかえし（命令のオブジェクトで覚える。変えていない命令は編集の後も同じオブジェクトのまま）
	collapsed: ReadonlySet<Command>;
	// 最後に入れたカード（差し込み位置に飛び込む動きのため）
	arrived: Command | null;
	// 読み取れたカードの数（効果音のため）
	scans: number;
	notice: Notice | null;
	run: Run | null;
};

export type PlayAction =
	| { type: "scanned"; cards: Card[] }
	| { type: "cursorMoved"; cursor: Cursor }
	| { type: "removed"; path: number[] }
	| { type: "lastRemoved" }
	| { type: "cleared" }
	| { type: "timesChanged"; path: number[]; times: number }
	| { type: "toggled"; path: number[] }
	| { type: "sent" }
	| { type: "sendFailed" }
	| { type: "received"; result: CompileResult }
	| { type: "turnEnded"; turn: number }
	| { type: "paused" }
	| { type: "resumed" }
	| { type: "steppedBack" }
	| { type: "steppedForward" }
	| { type: "fixing" };

export function initialPlayState(maxCards: number | null): PlayState {
	return {
		maxCards,
		program: [],
		cursor: [0],
		collapsed: new Set(),
		arrived: null,
		scans: 0,
		notice: null,
		run: null,
	};
}

function scanOne(state: PlayState, card: Card): PlayState {
	if (card.type === "end" && !isInsideRepeat(state.cursor)) {
		return { ...state, notice: { kind: "endOutsideRepeat" } };
	}
	const inserted = insertCard(state.program, state.cursor, card);
	if (card.type !== "end") {
		// 入れる前に（入れた後の木で）大きさを確かめ、超えるなら入れない
		const validation = validateProgram(inserted.program, state.maxCards);
		if (!validation.ok)
			return { ...state, notice: { kind: "programError", error: validation.reason } };
	}
	return {
		...state,
		...inserted,
		arrived:
			card.type === "end" ? state.arrived : commandAt(inserted.program, previousOf(inserted, card)),
		scans: state.scans + 1,
		notice: null,
	};
}

// 入れた命令の位置。くりかえすは差し込み位置がそのbodyの先頭、他は直後にあるので、そこから戻す
function previousOf({ cursor }: { cursor: Cursor }, card: Card): number[] {
	if (card.type === "repeat") return cursor.slice(0, -1);
	return cursor.map((index, level) => (level === cursor.length - 1 ? index - 1 : index));
}

function remove(state: PlayState, path: number[]): PlayState {
	return {
		...state,
		program: removeCommand(state.program, path).program,
		cursor: cursorAfterRemove(state.cursor, path),
		notice: null,
	};
}

function startsWith(path: readonly number[], prefix: readonly number[]): boolean {
	return path.length > prefix.length && prefix.every((index, level) => path[level] === index);
}

function toggle(state: PlayState, path: number[]): PlayState {
	const command = commandAt(state.program, path);
	if (command.type !== "repeat") return state;
	const collapsed = new Set(state.collapsed);
	if (collapsed.delete(command)) return { ...state, collapsed };

	collapsed.add(command);
	// 閉じたくりかえしの中に差し込み位置を残さない（見えなくなるため）。そのくりかえしの直後に移す
	const cursor = startsWith(state.cursor, path)
		? path.map((index, level) => (level === path.length - 1 ? index + 1 : index))
		: state.cursor;
	return { ...state, collapsed, cursor };
}

function changeTimes(state: PlayState, path: number[], times: number): PlayState {
	const before = commandAt(state.program, path);
	const program = setRepeatTimes(state.program, path, times);
	if (!state.collapsed.has(before)) return { ...state, program };
	// 回数を変えたくりかえしは新しいオブジェクトになるので、閉じたことを引き継ぐ
	const collapsed = new Set(state.collapsed);
	collapsed.delete(before);
	collapsed.add(commandAt(program, path));
	return { ...state, program, collapsed };
}

// 「つくる」の間だけできる操作
function edit(state: PlayState, action: PlayAction): PlayState {
	switch (action.type) {
		case "scanned":
			return action.cards.reduce(scanOne, state);
		case "cursorMoved":
			return { ...state, cursor: action.cursor };
		case "removed":
			return remove(state, action.path);
		case "lastRemoved": {
			const path = lastCommandPath(state.program);
			return path === null ? state : remove(state, path);
		}
		case "cleared":
			return { ...state, program: [], cursor: [0], collapsed: new Set(), notice: null };
		case "timesChanged":
			return changeTimes(state, action.path, action.times);
		case "toggled":
			return toggle(state, action.path);
		case "sent":
			return state.program.length === 0
				? state
				: { ...state, run: { phase: "sending" }, notice: null };
		default:
			return state;
	}
}

// 1ターンの動きが終わった
function endTurn(run: Extract<Run, { phase: "running" }>, turn: number): Run {
	if (turn !== run.turn) return run;
	const next = turn + 1;
	if (next >= run.result.steps.length) return { phase: "done", result: run.result };
	return { ...run, turn: next, playback: run.playback === "playing" ? "playing" : "paused" };
}

// 動かしている間の操作
function play(run: Extract<Run, { phase: "running" }>, action: PlayAction): Run {
	switch (action.type) {
		case "turnEnded":
			return endTurn(run, action.turn);
		case "paused":
			return run.playback === "playing" ? { ...run, playback: "pausing" } : run;
		case "resumed":
			return run.playback === "pausing" || run.playback === "paused"
				? { ...run, playback: "playing" }
				: run;
		case "steppedBack":
			return run.playback === "paused" && run.turn > 0 ? { ...run, turn: run.turn - 1 } : run;
		case "steppedForward":
			return run.playback === "paused" ? { ...run, playback: "stepping" } : run;
		default:
			return run;
	}
}

export function playReducer(state: PlayState, action: PlayAction): PlayState {
	const { run } = state;
	if (run === null) return edit(state, action);

	switch (run.phase) {
		case "sending":
			if (action.type === "sendFailed") return { ...state, run: null, notice: { kind: "offline" } };
			if (action.type !== "received") return state;
			return {
				...state,
				run:
					action.result.steps.length === 0
						? { phase: "done", result: action.result }
						: { phase: "running", result: action.result, turn: 0, playback: "playing" },
			};
		case "running": {
			const next = play(run, action);
			return next === run ? state : { ...state, run: next };
		}
		case "done":
			return action.type === "fixing" ? { ...state, run: null } : state;
	}
}

// ロボットが動いているか（前にもどる・次に進むを押せない）
export function isAnimating(run: Run | null): boolean {
	return run?.phase === "running" && run.playback !== "paused";
}

/*
 * カードの並びで、枠と色で示す今のターンのカード
 * 動いている間は今動かしているターン、止まっている間と結果は最後に動かしたターン
 * bumpとfallの結果だけ、止まったカードを赤くする（failed）
 */
export function currentCard(run: Run | null): { path: number[]; failed: boolean } | null {
	if (run === null || run.phase === "sending") return null;
	const { steps } = run.result;
	if (run.phase === "done") {
		const last = steps.at(-1);
		if (last === undefined) return null;
		const failed = run.result.outcome === "bump" || run.result.outcome === "fall";
		return { path: last.path, failed };
	}
	const step = isAnimating(run) ? steps[run.turn] : steps[run.turn - 1];
	return step === undefined ? null : { path: step.path, failed: false };
}
