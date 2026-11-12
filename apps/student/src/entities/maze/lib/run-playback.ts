/*
 * プレイ画面で、あるターンの状態を求める（仕様書README.mdの「ロボットを動かす」）
 * 端末は自分ではcompileし直さず、サーバーから届いたstepsをなぞる（domain.mdの「コンパイル」）
 * ターンは「何個目のstepまで終わったか」。0はまだ動いていない状態、steps.lengthは全部終わった状態
 */
import { FLOOR } from "@kasane/core";
import type { Cell, Direction, Maze, Step } from "@kasane/core";

import { cellPositions } from "./scene-layout";

export type RobotState = {
	layer: number;
	x: number;
	y: number;
	direction: Direction;
	// 穴に落ちた後は見えない
	visible: boolean;
};

function assertTurn(steps: readonly Step[], turn: number): void {
	if (!Number.isInteger(turn) || turn < 0 || turn > steps.length) {
		throw new Error(`ターンがstepsの外（${turn}）`);
	}
}

// スタートのマスに、startDirectionの向きで立つ
export function startState(maze: Maze): RobotState {
	const start = cellPositions(maze).byCell.start[0];
	if (start === undefined) throw new Error("迷路にスタートがない");
	return {
		layer: start.layer,
		x: start.x,
		y: start.y,
		direction: maze.startDirection,
		visible: true,
	};
}

export function robotAt(maze: Maze, steps: readonly Step[], turn: number): RobotState {
	assertTurn(steps, turn);
	const step = steps[turn - 1];
	if (step === undefined) return startState(maze);

	const { layer, x, y, direction, event } = step;
	return { layer, x, y, direction, visible: event !== "fall" };
}

type Place = { layer: number; y: number; x: number };

/*
 * そのターンの迷路。turnまでに埋めた穴と取った鍵を床にする
 * animatingは、turn個目のstepを動かしている間。鍵を取るstepなら、その鍵も外す（鍵は上がって消える動きで別に描く）
 * 埋める穴は、動かしている間は穴のまま（光る球が大きくなった後に床に変わる）
 * 何も変わらなければ元の迷路をそのまま返し、変える階と行だけを複製する
 */
export function boardAt(maze: Maze, steps: readonly Step[], turn: number, animating = false): Maze {
	assertTurn(steps, turn);
	const cleared: Place[] = [];
	steps.forEach((step, index) => {
		if (index < turn && step.filled !== undefined) cleared.push(step.filled);
		const tookKeyBy = animating ? index <= turn : index < turn;
		if (tookKeyBy && step.tookKey === true) cleared.push(step);
	});
	if (cleared.length === 0) return maze;

	const layers = maze.layers.map((rows, layer) => {
		const onLayer = cleared.filter((place) => place.layer === layer);
		if (onLayer.length === 0) return rows;
		return rows.map((cells, y): Cell[] => {
			const onRow = onLayer.filter((place) => place.y === y);
			if (onRow.length === 0) return cells;
			return cells.map((cell, x) => (onRow.some((place) => place.x === x) ? FLOOR : cell));
		});
	});
	return { ...maze, layers };
}
