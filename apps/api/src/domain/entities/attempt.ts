/*
 * 1回の挑戦（プログラムを1回送った記録。仕様書backend.mdの「データモデル」）
 */
import type { Program } from "@kasane/core";

// 挑戦した問題。チュートリアルか自分の迷路の、ちょうど一方
export type AttemptTarget = { readonly tutorialNo: number } | { readonly mazeId: string };

export type NewAttempt = {
	readonly studentId: string;
	readonly target: AttemptTarget;
	readonly program: Program;
	// compileの結果がgoalだったか
	readonly succeeded: boolean;
};
