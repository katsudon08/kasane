/*
 * 結果の表示（仕様書README.mdの「ロボットを動かす」の結果、domain.mdの「児童画面の文言」）
 */
import { TUTORIALS } from "@kasane/core";
import type { CompileResult, Program } from "@kasane/core";

import { commandIndex } from "../../../features/edit-program";

// どの迷路で遊んでいるか（送り先と、ゴールの後の行き先を決める）
export type PlayTarget = { kind: "tutorial"; no: number } | { kind: "maze"; mazeId: string };

/*
 * 失敗の文言の{n}（原因のカードの番号）。番号を使うのはbumpとfallだけ
 * tooLongなどは最後に実行したカードが原因ではないので、番号を出さない
 */
export function failedCardNumber(program: Program, result: CompileResult): number | null {
	if (result.outcome !== "bump" && result.outcome !== "fall") return null;
	const last = result.steps.at(-1);
	return last === undefined ? null : commandIndex(program, last.path);
}

export type AfterGoal = { kind: "nextTutorial"; no: number } | { kind: "home" };

// ゴールの主ボタンの行き先。次の問題があれば次の問題、最後の問題と自分の迷路はホーム
export function afterGoal(target: PlayTarget): AfterGoal {
	if (target.kind === "tutorial" && target.no < TUTORIALS.length) {
		return { kind: "nextTutorial", no: target.no + 1 };
	}
	return { kind: "home" };
}
