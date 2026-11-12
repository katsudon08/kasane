/*
 * テレポートの光の演出（仕様書README.mdの「1ターンの動き」のteleported）
 * ロボットが縮んで消える間（vanish）と、隣の階に現れる間（appear）に、元の階と移る先の階をつなぐ光の柱を立てる
 * 3Dは、ここで求めた値をuseFrameの中でrefに書き込む
 */
import type { Step } from "@kasane/core";

import type { Motion, Placement } from "./robot-motion";
import type { RobotState } from "./run-playback";

export type WarpStage = "vanish" | "appear";

export type Warp = {
	// 上の階へ移るか（上へは赤、下へは青で光らせる）
	up: boolean;
	// 元の階のテレポートのマス
	from: Placement;
	// 移る先の階の、同じ行・列のマス
	to: Placement;
	stage: WarpStage;
	// その段階の進み具合（0〜1）
	progress: number;
};

export function warpAt(from: RobotState, step: Step, motion: Motion, elapsed: number): Warp | null {
	if (step.teleported !== true) return null;
	const phase = motion.phases.find(
		(candidate) =>
			(candidate.kind === "vanish" || candidate.kind === "appear") &&
			elapsed > candidate.start &&
			elapsed < candidate.end,
	);
	if (phase === undefined || (phase.kind !== "vanish" && phase.kind !== "appear")) return null;

	return {
		up: step.layer > from.layer,
		from: { layer: from.layer, x: step.x, y: step.y },
		to: { layer: step.layer, x: step.x, y: step.y },
		stage: phase.kind,
		progress: (elapsed - phase.start) / (phase.end - phase.start),
	};
}

export type WarpLook = {
	// 光の柱の濃さと、模様が流れる量
	beamOpacity: number;
	beamFlow: number;
	// 床に広がる光の輪の場所・大きさ・濃さ
	burstAt: "from" | "to";
	burstScale: number;
	burstOpacity: number;
	// 光の粒が元の階から先の階へ進んだ割合（0〜1）と、らせんの回り具合
	travel: number;
	spin: number;
};

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function easeOut(t: number): number {
	return 1 - (1 - t) ** 3;
}

export function warpLook(stage: WarpStage, progress: number): WarpLook {
	const p = clamp01(progress);
	// 消える段階と現れる段階を、続けて0〜1で数えた値
	const whole = stage === "vanish" ? p / 2 : 0.5 + p / 2;
	return {
		beamOpacity: stage === "vanish" ? easeOut(p) : 1 - p ** 2,
		beamFlow: whole * 3,
		burstAt: stage === "vanish" ? "from" : "to",
		burstScale: 0.3 + 1.5 * easeOut(p),
		burstOpacity: 1 - p,
		travel: whole,
		spin: whole * Math.PI * 6,
	};
}
