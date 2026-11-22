/*
 * 自由モードの記録をlocalStorageに読み書きする（仕様書free-mode.mdの「記録」）
 * 授業で使うモードのAPIと同じく、呼び出し側（TanStack Query）が扱えるようasyncにする
 * 授業で使うモードでサーバーが断る呼び出し（解けない問題・迷路を作れないときなど）は、画面が先に止めているので、
 * ここに来たら呼び出し側の誤りとして例外にする。書き込みの失敗も例外のまま、うまく動かなかったときの受け止めに任せる
 */
import {
	TUTORIALS,
	canCreateMaze,
	compile,
	isTutorialUnlocked,
	validateProgram,
} from "@kasane/core";
import type { CompileResult, Maze, Program } from "@kasane/core";

import { nextClearedCount, readClearedCount } from "../lib/cleared-count";
import type { ClearedChange } from "../lib/cleared-count";
import { addMaze, removeMaze, replaceMaze } from "../lib/maze-changes";
import type { MazeChange, MazeContent } from "../lib/maze-changes";
import { readMazes } from "../lib/stored-mazes";
import type { FreeMaze } from "../lib/stored-mazes";

// 仕様書free-mode.mdの「記録」が決めたキー
const CLEARED_COUNT_KEY = "kasane.free.clearedCount";
const MAZES_KEY = "kasane.free.mazes";

function storedClearedCount(): number {
	return readClearedCount(localStorage.getItem(CLEARED_COUNT_KEY));
}

function storedMazes(): FreeMaze[] {
	return readMazes(localStorage.getItem(MAZES_KEY));
}

function changeClearedCount(change: ClearedChange): void {
	const next = nextClearedCount(storedClearedCount(), change);
	localStorage.setItem(CLEARED_COUNT_KEY, JSON.stringify(next));
}

function storeMazes(change: MazeChange): void {
	if (!change.ok) throw new Error(`迷路を保存できなかった（${change.reason}）`);
	localStorage.setItem(MAZES_KEY, JSON.stringify(change.mazes));
}

function now(): string {
	return new Date().toISOString();
}

export async function loadClearedCount(): Promise<number> {
	return storedClearedCount();
}

// updatedAtが新しい順
export async function loadMazes(): Promise<FreeMaze[]> {
	return storedMazes();
}

// サーバーと同じく、枚数の上限・命令の数・入れ子の深さを確かめてからコンパイルする
function compileChecked(maze: Maze, program: Program, maxCards: number | null): CompileResult {
	const validation = validateProgram(program, maxCards);
	if (!validation.ok) throw new Error(`プログラムが正しくない（${validation.reason.kind}）`);
	return compile(maze, program);
}

// チュートリアルを端末でコンパイルし、ゴールしたらクリア数を増やす
export async function playTutorial(no: number, program: Program): Promise<CompileResult> {
	const tutorial = TUTORIALS[no - 1];
	if (tutorial === undefined) throw new Error(`チュートリアル${no}はない`);
	if (!isTutorialUnlocked(no, storedClearedCount())) {
		throw new Error(`チュートリアル${no}は解けない`);
	}

	const result = compileChecked(tutorial.maze, program, tutorial.maxCards);
	if (result.outcome === "goal") changeClearedCount({ kind: "goal", no });
	return result;
}

// 自分の迷路を端末でコンパイルする。クリア数は変わらず、何も保存しない
export async function playMaze(mazeId: string, program: Program): Promise<CompileResult> {
	const maze = storedMazes().find((candidate) => candidate.mazeId === mazeId);
	if (maze === undefined) throw new Error(`迷路${mazeId}はない`);
	// 自分の迷路には枚数の上限がない（domain.mdの「プログラムの正しさ」）
	return compileChecked(maze.data, program, null);
}

/*
 * to問目から始められるよう、1〜to - 1問目をクリアしたことにする
 * toは2〜チュートリアルの数＋1（＋1は全部飛ばす）。外れていれば呼び出し側の誤り（backend.mdのPOST /me/tutorials/skipと同じ範囲）
 */
export async function skipTutorials(to: number): Promise<void> {
	if (!Number.isInteger(to) || to < 2 || to > TUTORIALS.length + 1) {
		throw new Error(`${to}問目へは飛ばせない`);
	}
	changeClearedCount({ kind: "skip", to });
}

// 問題の進み具合を消し、1問目からやり直しにする。自分の迷路は消さない（free-mode.mdの「問題をリセットする」）
export async function resetTutorials(): Promise<void> {
	changeClearedCount({ kind: "reset" });
}

// 新しく作った迷路と、QRでもらった迷路を足す。作った迷路のmazeIdを返す
export async function createMaze(content: MazeContent): Promise<string> {
	if (!canCreateMaze(storedClearedCount())) throw new Error("まだ迷路を作れない");
	const mazeId = crypto.randomUUID();
	storeMazes(addMaze(storedMazes(), content, { mazeId, now: now() }));
	return mazeId;
}

export async function updateMaze(mazeId: string, content: MazeContent): Promise<void> {
	storeMazes(replaceMaze(storedMazes(), mazeId, content, now()));
}

// もう消えていた迷路を消しても、何も起きない
export async function deleteMaze(mazeId: string): Promise<void> {
	localStorage.setItem(MAZES_KEY, JSON.stringify(removeMaze(storedMazes(), mazeId)));
}
