/*
 * 結果の表示（仕様書README.mdの「ロボットを動かす」の結果、domain.mdの「児童画面の文言」）
 * - 失敗の文言の{n}は原因のカードの番号（1始まり。pathからcommandIndexで求める）。番号を使うのはbumpとfallだけ
 * - ゴールの主ボタンは「次の問題に進む」（最後の問題なら「ホームにもどる」）。自分の迷路では「ホームにもどる」
 */
import { TUTORIALS, compile } from "@kasane/core";
import type { Command, Maze } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { afterGoal, failedCardNumber } from "./outcome";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };

function tutorialMaze(no: number): Maze {
	const tutorial = TUTORIALS[no - 1];
	if (tutorial === undefined) throw new Error(`チュートリアル${no}がない`);
	return tutorial.maze;
}

describe("failedCardNumber", () => {
	it("bumpは、ぶつかったカードの番号", () => {
		// 1 前、2 くりかえす［3 右、4 前］
		const program: Command[] = [forward, { type: "repeat", times: 2, body: [right, forward] }];
		const result = compile(tutorialMaze(1), program);

		expect(result.outcome).toBe("bump");
		expect(failedCardNumber(program, result)).toBe(4);
	});

	it("fallは、穴に落ちたカードの番号", () => {
		const program: Command[] = [forward];

		expect(failedCardNumber(program, compile(tutorialMaze(4), program))).toBe(1);
	});

	it.each([
		{ outcome: "goal", program: [forward, forward, forward, forward] },
		{ outcome: "notReached", program: [forward] },
	])("$outcomeは番号を使わない", ({ program }) => {
		expect(failedCardNumber(program, compile(tutorialMaze(1), program))).toBeNull();
	});
});

describe("afterGoal", () => {
	it.each(TUTORIALS.slice(0, -1).map((tutorial) => tutorial.no))(
		"問題%iの後は、次の問題へ進む",
		(no) => {
			expect(afterGoal({ kind: "tutorial", no })).toEqual({ kind: "nextTutorial", no: no + 1 });
		},
	);

	it("最後の問題の後は、ホームにもどる", () => {
		expect(afterGoal({ kind: "tutorial", no: TUTORIALS.length })).toEqual({ kind: "home" });
	});

	it("自分の迷路の後は、ホームにもどる", () => {
		expect(afterGoal({ kind: "maze", mazeId: "4b9b5a61-1b0e-4a0b-9d63-3f1a3f0c6a52" })).toEqual({
			kind: "home",
		});
	});
});
