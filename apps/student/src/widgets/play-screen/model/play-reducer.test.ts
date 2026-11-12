/*
 * プレイ画面の状態（仕様書README.mdの「プレイ」、domain.mdの「カードの並びの編集」「プログラムの正しさ」）
 * - 「プログラムをつくる」と「ロボットを動かす」の二つの状態が、同じ画面の中で切り替わる
 * - カードは読み取るたびに木構造へ差し込む。上限（validateProgram）に当たったら入れずに文言を出す
 * - 動かしている間はカードの読み取りと差し込みができない
 * - 一時停止・前にもどる・次に進むは、止まっている間だけ押せる
 * - 結果が出て「プログラムを直す」を押すと、カードの並びを残したまま「つくる」へ戻る
 */
import { TUTORIALS, compile } from "@kasane/core";
import type { Card, CardType, Command, CompileResult, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { currentCard, initialPlayState, isAnimating, playReducer } from "./play-reducer";
import type { PlayAction, PlayState } from "./play-reducer";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };

function card(type: CardType): Card {
	return { type };
}

function tutorialMaze(no: number): Maze {
	const tutorial = TUTORIALS[no - 1];
	if (tutorial === undefined) throw new Error(`チュートリアル${no}がない`);
	return tutorial.maze;
}

function run(state: PlayState, ...actions: PlayAction[]): PlayState {
	return actions.reduce(playReducer, state);
}

function scan(...types: CardType[]): PlayAction {
	return { type: "scanned", cards: types.map(card) };
}

// チュートリアル1を前×4で解いた結果（4ターン）
const GOAL_RESULT: CompileResult = compile(tutorialMaze(1), [forward, forward, forward, forward]);
// 前×2で、ゴールに着かない結果（2ターン）
const NOT_REACHED: CompileResult = compile(tutorialMaze(1), [forward, forward]);

// 前×4を並べて送り、結果が届いて動いている状態
function running(result: CompileResult = GOAL_RESULT): PlayState {
	return run(
		initialPlayState(null),
		scan("forward", "forward", "forward", "forward"),
		{ type: "sent" },
		{ type: "received", result },
	);
}

describe("はじめ", () => {
	it("カードはなく、差し込み位置は一番外側の末尾、「つくる」の状態", () => {
		const state = initialPlayState(7);

		expect(state).toMatchObject({ program: [], cursor: [0], run: null, notice: null, scans: 0 });
	});
});

describe("カードを読み取ったとき", () => {
	it("差し込み位置に入れ、差し込み位置を進める", () => {
		const state = run(initialPlayState(null), scan("forward"), scan("right"));

		expect(state.program).toEqual([forward, right]);
		expect(state.cursor).toEqual([2]);
		expect(state.scans).toBe(2);
	});

	it("一度に読み取った複数のカードは、順に入れる", () => {
		const state = run(initialPlayState(null), scan("repeat", "forward", "end", "right"));

		expect(state.program).toEqual([{ type: "repeat", times: 2, body: [forward] }, right]);
		expect(state.cursor).toEqual([2]);
	});

	it("入れたカードを、飛び込む動きのために覚える", () => {
		const state = run(initialPlayState(null), scan("forward"), scan("right"));

		expect(state.arrived).toBe(state.program[1]);
	});

	it("くりかえし終わりで差し込み位置を動かしたときも、読み取れたことにする（効果音のため）", () => {
		const state = run(initialPlayState(null), scan("repeat"), scan("end"));

		expect(state.cursor).toEqual([1]);
		expect(state.scans).toBe(2);
	});

	it("くりかえしの外でくりかえし終わりを読み取ったら、何も入れずにendOutsideRepeatの文言を出す", () => {
		const before = run(initialPlayState(null), scan("forward"));
		const state = playReducer(before, { type: "scanned", cards: [card("end")] });

		expect(state.program).toBe(before.program);
		expect(state.cursor).toEqual([1]);
		expect(state.scans).toBe(1);
		expect(state.notice).toEqual({ kind: "endOutsideRepeat" });
	});

	it("問題の上限枚数を超えるなら、入れずにtooManyCardsの文言を出す", () => {
		const full = run(initialPlayState(3), scan("forward", "forward", "forward"));
		const state = playReducer(full, scan("right"));

		expect(state.program).toBe(full.program);
		expect(state.scans).toBe(3);
		expect(state.notice).toEqual({
			kind: "programError",
			error: { kind: "tooManyCards", limit: 3 },
		});
	});

	it("くりかえしは「くりかえし終わり」の分も1枚と数える", () => {
		const state = run(initialPlayState(1), scan("repeat"));

		expect(state.program).toEqual([]);
		expect(state.notice).toEqual({
			kind: "programError",
			error: { kind: "tooManyCards", limit: 1 },
		});
	});

	it("くりかえしの入れ子が深すぎるなら、入れずにtooDeepの文言を出す", () => {
		const state = run(initialPlayState(null), scan("repeat", "repeat", "repeat"), scan("repeat"));

		expect(state.notice).toEqual({ kind: "programError", error: { kind: "tooDeep", limit: 3 } });
		expect(state.cursor).toEqual([0, 0, 0, 0]);
	});

	it("次に読み取れたら、文言を消す", () => {
		const state = run(initialPlayState(null), scan("end"), scan("forward"));

		expect(state.notice).toBeNull();
	});

	it("動かしている間は、読み取っても何もしない", () => {
		const before = running();

		expect(playReducer(before, scan("right"))).toBe(before);
	});

	it("送って結果を待つ間も、読み取っても何もしない", () => {
		const before = run(initialPlayState(null), scan("forward"), { type: "sent" });

		expect(playReducer(before, scan("right"))).toBe(before);
	});
});

describe("カードの並びの操作", () => {
	it("出っ張りを押すと、そこが差し込み位置になる", () => {
		const state = run(initialPlayState(null), scan("forward", "right"), {
			type: "cursorMoved",
			cursor: [1],
		});

		expect(state.cursor).toEqual([1]);
	});

	it("ゴミ箱でそのカードを消し、差し込み位置がその中にあれば消した場所に移す", () => {
		const state = run(initialPlayState(null), scan("forward", "repeat", "right"), {
			type: "removed",
			path: [1],
		});

		expect(state.program).toEqual([forward]);
		expect(state.cursor).toEqual([1]);
	});

	it("消したカードより後ろの差し込み位置は、一つ前にずれる", () => {
		const state = run(initialPlayState(null), scan("forward", "right"), {
			type: "removed",
			path: [0],
		});

		expect(state.program).toEqual([right]);
		expect(state.cursor).toEqual([1]);
	});

	it("「最後のカードを消す」は、木を上から数えて一番最後のカードを消す", () => {
		const state = run(initialPlayState(null), scan("forward", "repeat", "right", "end"), {
			type: "lastRemoved",
		});

		expect(state.program).toEqual([forward, { type: "repeat", times: 2, body: [] }]);
		expect(state.cursor).toEqual([2]);
	});

	it("カードがないときの「最後のカードを消す」は何もしない", () => {
		const before = initialPlayState(null);

		expect(playReducer(before, { type: "lastRemoved" })).toBe(before);
	});

	it("「カードを全部消す」で、空の並びに戻る", () => {
		const state = run(initialPlayState(null), scan("forward", "repeat", "right"), {
			type: "cleared",
		});

		expect(state.program).toEqual([]);
		expect(state.cursor).toEqual([0]);
	});

	it("くりかえしの回数を変える", () => {
		const state = run(initialPlayState(null), scan("repeat", "forward"), {
			type: "timesChanged",
			path: [0],
			times: 6,
		});

		expect(state.program).toEqual([{ type: "repeat", times: 6, body: [forward] }]);
	});

	it("くりかえしのカードを押すと、中を閉じ、もう一度押すと開く", () => {
		const opened = run(initialPlayState(null), scan("repeat", "forward", "end"));
		const closed = playReducer(opened, { type: "toggled", path: [0] });
		const reopened = playReducer(closed, { type: "toggled", path: [0] });

		expect(closed.collapsed.has(closed.program[0] as Command)).toBe(true);
		expect(reopened.collapsed.size).toBe(0);
	});

	it("差し込み位置が中にあるくりかえしを閉じたら、差し込み位置をそのくりかえしの直後に移す", () => {
		const state = run(initialPlayState(null), scan("repeat", "forward"), {
			type: "toggled",
			path: [0],
		});

		expect(state.cursor).toEqual([1]);
	});

	it("閉じたくりかえしの回数を変えても、閉じたまま", () => {
		const state = run(
			initialPlayState(null),
			scan("repeat", "forward", "end"),
			{ type: "toggled", path: [0] },
			{ type: "timesChanged", path: [0], times: 4 },
		);

		expect(state.collapsed.has(state.program[0] as Command)).toBe(true);
	});

	it.each([
		{ name: "動いている間", state: () => running() },
		{
			name: "一時停止の間",
			state: () => run(running(), { type: "paused" }, { type: "turnEnded", turn: 0 }),
		},
		{
			name: "結果を出した後",
			state: () =>
				run(running(NOT_REACHED), { type: "turnEnded", turn: 0 }, { type: "turnEnded", turn: 1 }),
		},
	])("$nameは、並びを変えられない", ({ state }) => {
		const before = state();
		const actions: PlayAction[] = [
			{ type: "cursorMoved", cursor: [0] },
			{ type: "removed", path: [0] },
			{ type: "lastRemoved" },
			{ type: "cleared" },
			{ type: "timesChanged", path: [0], times: 3 },
			{ type: "toggled", path: [0] },
		];

		for (const action of actions) {
			expect(playReducer(before, action)).toBe(before);
		}
	});
});

describe("ロボットを動かす", () => {
	it("送ると、結果を待つ状態になる。文言は消す", () => {
		const state = run(initialPlayState(null), scan("end", "forward"), { type: "sent" });

		expect(state.run).toEqual({ phase: "sending" });
		expect(state.notice).toBeNull();
	});

	it("カードが0枚のときは送れない", () => {
		const before = initialPlayState(null);

		expect(playReducer(before, { type: "sent" })).toBe(before);
	});

	it("送れなかったら「つくる」へ戻り、通信できない文言を出す（カードの並びは残す）", () => {
		const state = run(
			initialPlayState(null),
			scan("forward"),
			{ type: "sent" },
			{ type: "sendFailed" },
		);

		expect(state.run).toBeNull();
		expect(state.program).toEqual([forward]);
		expect(state.notice).toEqual({ kind: "offline" });
	});

	it("結果が届いたら、1ターン目から動かし始める", () => {
		expect(running().run).toEqual({
			phase: "running",
			result: GOAL_RESULT,
			turn: 0,
			playback: "playing",
		});
	});

	it("stepsが空なら、すぐ結果を出す", () => {
		const empty: CompileResult = { steps: [], outcome: "notReached" };
		const state = run(
			initialPlayState(null),
			scan("repeat"),
			{ type: "sent" },
			{ type: "received", result: empty },
		);

		expect(state.run).toEqual({ phase: "done", result: empty });
	});

	it("1ターンの動きが終わるたびに、次のターンへ進む", () => {
		const state = run(running(), { type: "turnEnded", turn: 0 }, { type: "turnEnded", turn: 1 });

		expect(state.run).toMatchObject({ phase: "running", turn: 2, playback: "playing" });
	});

	it("前のターンの終わりの知らせが遅れて届いても、無視する", () => {
		const before = run(running(), { type: "turnEnded", turn: 0 });

		expect(playReducer(before, { type: "turnEnded", turn: 0 })).toBe(before);
	});

	it("最後のターンが終わったら、結果を出す", () => {
		const state = run(
			running(NOT_REACHED),
			{ type: "turnEnded", turn: 0 },
			{ type: "turnEnded", turn: 1 },
		);

		expect(state.run).toEqual({ phase: "done", result: NOT_REACHED });
	});

	it("一時停止は今のターンの動きを終えてから止まる。止まるまでは前後に動かせない", () => {
		const pausing = run(running(), { type: "paused" });
		expect(pausing.run).toMatchObject({ turn: 0, playback: "pausing" });
		expect(playReducer(pausing, { type: "steppedBack" })).toBe(pausing);
		expect(playReducer(pausing, { type: "steppedForward" })).toBe(pausing);

		const paused = playReducer(pausing, { type: "turnEnded", turn: 0 });
		expect(paused.run).toMatchObject({ turn: 1, playback: "paused" });
	});

	it("止まる途中や止まっているときに「ロボットを動かす」を押すと、続きから動く", () => {
		const resumedWhilePausing = run(running(), { type: "paused" }, { type: "resumed" });
		const resumedAfterPaused = run(
			running(),
			{ type: "paused" },
			{ type: "turnEnded", turn: 0 },
			{ type: "resumed" },
		);

		expect(resumedWhilePausing.run).toMatchObject({ turn: 0, playback: "playing" });
		expect(resumedAfterPaused.run).toMatchObject({ turn: 1, playback: "playing" });
	});

	it("「前にもどる」は、止まっている間だけ一つ前のターンに戻す。最初のターンより前には戻らない", () => {
		const paused = run(
			running(),
			{ type: "turnEnded", turn: 0 },
			{ type: "paused" },
			{ type: "turnEnded", turn: 1 },
		);
		const back = run(paused, { type: "steppedBack" });
		const backTwice = run(back, { type: "steppedBack" });

		expect(back.run).toMatchObject({ turn: 1, playback: "paused" });
		expect(backTwice.run).toMatchObject({ turn: 0, playback: "paused" });
		expect(playReducer(backTwice, { type: "steppedBack" })).toBe(backTwice);
		expect(playReducer(running(), { type: "steppedBack" })).toMatchObject({ run: running().run });
	});

	it("「次に進む」は、止まっている間だけ1ターン分を動かして、また止まる", () => {
		const paused = run(running(), { type: "paused" }, { type: "turnEnded", turn: 0 });
		const stepping = playReducer(paused, { type: "steppedForward" });
		const stepped = playReducer(stepping, { type: "turnEnded", turn: 1 });

		expect(stepping.run).toMatchObject({ turn: 1, playback: "stepping" });
		expect(stepped.run).toMatchObject({ turn: 2, playback: "paused" });
	});

	it("「次に進む」で最後のターンまで進めると、結果を出す", () => {
		const state = run(
			running(NOT_REACHED),
			{ type: "paused" },
			{ type: "turnEnded", turn: 0 },
			{ type: "steppedForward" },
			{ type: "turnEnded", turn: 1 },
		);

		expect(state.run).toEqual({ phase: "done", result: NOT_REACHED });
	});

	it("結果の後に「プログラムを直す」を押すと、カードの並びを残したまま「つくる」へ戻る", () => {
		const done = run(
			running(NOT_REACHED),
			{ type: "turnEnded", turn: 0 },
			{ type: "turnEnded", turn: 1 },
		);
		const state = playReducer(done, { type: "fixing" });

		expect(state.run).toBeNull();
		expect(state.program).toBe(done.program);
		expect(state.cursor).toBe(done.cursor);
	});

	it("結果が出る前は「プログラムを直す」で戻れない（動かしている途中で「つくる」へ戻る方法は置かない）", () => {
		const before = running();

		expect(playReducer(before, { type: "fixing" })).toBe(before);
	});
});

describe("isAnimating（ロボットが動いているか）", () => {
	it.each([
		{ playback: "playing", expected: true },
		{ playback: "pausing", expected: true },
		{ playback: "stepping", expected: true },
		{ playback: "paused", expected: false },
	] as const)("$playbackなら$expected", ({ playback, expected }) => {
		expect(isAnimating({ phase: "running", result: GOAL_RESULT, turn: 0, playback })).toBe(
			expected,
		);
	});

	it("結果を待つ間と、結果を出した後は動いていない", () => {
		expect(isAnimating({ phase: "sending" })).toBe(false);
		expect(isAnimating({ phase: "done", result: GOAL_RESULT })).toBe(false);
		expect(isAnimating(null)).toBe(false);
	});
});

describe("currentCard（今のターンのカード）", () => {
	const [first, second] = GOAL_RESULT.steps;

	it("動いている間は、今動かしているターンのカード", () => {
		expect(
			currentCard({ phase: "running", result: GOAL_RESULT, turn: 1, playback: "playing" }),
		).toEqual({ path: second?.path, failed: false });
	});

	it("止まっている間は、最後に動かしたターンのカード。まだ動かしていなければなし", () => {
		expect(
			currentCard({ phase: "running", result: GOAL_RESULT, turn: 1, playback: "paused" }),
		).toEqual({ path: first?.path, failed: false });
		expect(
			currentCard({ phase: "running", result: GOAL_RESULT, turn: 0, playback: "paused" }),
		).toBeNull();
	});

	it("bumpとfallの結果は、止まったカードを赤くする（文言がカードの番号を使う失敗だけ）", () => {
		const bump = compile(tutorialMaze(1), [right, forward]);
		const fall = compile(tutorialMaze(4), [forward]);
		const tooLong = compile(tutorialMaze(1), [
			{
				type: "repeat",
				times: 10,
				body: [{ type: "repeat", times: 10, body: [right, right, right] }],
			},
		]);

		expect(currentCard({ phase: "done", result: bump })).toEqual({ path: [1], failed: true });
		expect(currentCard({ phase: "done", result: fall })).toEqual({ path: [0], failed: true });
		expect(tooLong.outcome).toBe("tooLong");
		expect(currentCard({ phase: "done", result: tooLong })?.failed).toBe(false);
		expect(currentCard({ phase: "done", result: GOAL_RESULT })?.failed).toBe(false);
		expect(currentCard({ phase: "done", result: NOT_REACHED })?.failed).toBe(false);
	});

	it("「つくる」の間と、結果を待つ間はなし", () => {
		expect(currentCard(null)).toBeNull();
		expect(currentCard({ phase: "sending" })).toBeNull();
		expect(currentCard({ phase: "done", result: { steps: [], outcome: "notReached" } })).toBeNull();
	});
});
