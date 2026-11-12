/*
 * プレイ画面の迷路の3Dの動きを確かめる（仕様書README.mdの「ロボットを動かす」の1ターンの動き）
 * 問題5の解答の例をなぞり、テレポートで2階へ移った後も、どちらの階のマスも元の位置に描かれることを見る
 * サーバーとカメラは要らない（stepsはpackages/coreのcompileで作る）
 */
import { TUTORIALS, compile } from "@kasane/core";
import type { Maze } from "@kasane/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { LazyPlayScene } from "./maze-3d/LazyPlayScene";

const MAZE: Maze = TUTORIALS[4]?.maze ?? { layers: [], startDirection: "east" };
const RESULT = compile(MAZE, [
	{ type: "repeat", times: 3, body: [{ type: "forward" }] },
	{ type: "right" },
	{ type: "repeat", times: 6, body: [{ type: "forward" }] },
]);

function Playback() {
	const [turn, setTurn] = useState(0);
	const done = turn >= RESULT.steps.length;

	return (
		<div style={{ position: "relative", width: 640, height: 480, background: "#495057" }}>
			<LazyPlayScene
				maze={MAZE}
				animation={{ steps: RESULT.steps, outcome: RESULT.outcome, turn, animating: !done }}
				preparing={false}
				onTurnEnd={(ended) => setTurn(ended + 1)}
			/>
		</div>
	);
}

const meta = {
	title: "entities/maze/プレイの3D",
	component: Playback,
} satisfies Meta<typeof Playback>;

export default meta;

export const TeleportToSecondFloor: StoryObj<typeof meta> = {};
