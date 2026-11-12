/*
 * ロボットの1ターンの動き（仕様書README.mdの「ロボットを動かす」の「1ターンの動き」の表）
 * 1ターンを、進む・回る・縮むなどの区切り（phase）に分け、経過時間からその時刻の姿を求める
 * 3Dは、ここで求めた姿をuseFrameの中でrefに書き込む（1フレームごとにReactのstateを更新しない）
 * 位置はマスの単位（xは列、yは行）。階は整数で、テレポートでは現れるときに隣の階へ移る
 */
import type { Direction, Step } from "@kasane/core";

import type { RobotState } from "./run-playback";
import { DIRECTION_ANGLES } from "./scene-layout";

// stepsを1ターン1秒でなぞる
export const TURN_SECONDS = 1;

export type PhaseKind =
	| "move"
	| "turn"
	| "stay"
	| "fill"
	| "vanish"
	| "appear"
	| "key"
	| "spin"
	| "jump"
	| "fall";

// 区切りごとの長さ（秒）。進む・回る・うめる・ぶつかるは1ターンの1秒。続けてする動きは、その後に足す
const PHASE_SECONDS: Readonly<Record<PhaseKind, number>> = {
	move: TURN_SECONDS,
	turn: TURN_SECONDS,
	stay: TURN_SECONDS,
	fill: TURN_SECONDS,
	vanish: 0.6,
	appear: 0.6,
	key: 0.9,
	spin: 0.6,
	jump: 0.6,
	fall: 0.9,
};

export type Phase = { kind: PhaseKind; start: number; end: number };
export type Motion = { phases: Phase[]; duration: number };

// 進んだ先で続けてする動き（テレポート→鍵→ゴール）
function afterMove(step: Step, celebrate: boolean): PhaseKind[] {
	return [
		...(step.teleported === true ? (["vanish", "appear"] as const) : []),
		...(step.tookKey === true ? (["key"] as const) : []),
		...(celebrate ? (["spin", "jump"] as const) : []),
	];
}

function kindsOf(step: Step, celebrate: boolean): PhaseKind[] {
	switch (step.event) {
		case "move":
			return ["move", ...afterMove(step, false)];
		case "goal":
			// 鍵が残っていれば（celebrateが偽）跳ばない
			return ["move", ...afterMove(step, celebrate)];
		case "turn":
			return ["turn"];
		case "fill":
			return ["fill"];
		case "fillMiss":
			// 何も見せず、このターンの時間も使わない
			return [];
		case "bump":
			return ["stay"];
		case "fall":
			return ["move", "fall"];
	}
}

/*
 * 1ターンの区切りと長さ
 * celebrateは、このstepでゴールして成功したとき（最後のstepで、結果がgoal）。そのときだけ1回転して跳ぶ
 */
export function stepMotion(step: Step, celebrate: boolean): Motion {
	const phases: Phase[] = [];
	let time = 0;
	for (const kind of kindsOf(step, celebrate)) {
		const end = time + PHASE_SECONDS[kind];
		phases.push({ kind, start: time, end });
		time = end;
	}
	return { phases, duration: time };
}

export type Placement = { layer: number; x: number; y: number };
export type RobotFrame = Placement & { angle: number; scale: number; lift: number };
export type Frame = {
	robot: RobotFrame;
	// 穴をうめるときに現れる、青白く光る球
	orb: (Placement & { scale: number }) | null;
	// 取った鍵。マスの鍵の高さからの上がり具合
	key: (Placement & { lift: number; angle: number; scale: number }) | null;
};

const RIGHT_OF: Readonly<Record<Direction, Direction>> = {
	north: "east",
	east: "south",
	south: "west",
	west: "north",
};

// 跳ぶ高さ・鍵が上がる高さ・落ちるときに沈む深さ（マスの単位）
const JUMP_HEIGHT = 0.6;
const KEY_RISE = 1.2;
const FALL_DEPTH = 0.3;
// 跳ぶ時間のうち、上がりに使う割合（上がりは速く、下りは少しゆっくり）
const JUMP_UP_RATIO = 0.4;
// 落ちるときに回る回数
const FALL_TURNS = 4;
// テレポートで、消える間と現れる間にそれぞれ回る回数と、浮く高さ
const WARP_TURNS = 2;
const WARP_LIFT = 0.4;

const FULL_TURN = Math.PI * 2;

function easeInOut(p: number): number {
	return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}

function lerp(from: number, to: number, p: number): number {
	return from + (to - from) * p;
}

function jumpLift(p: number): number {
	if (p <= JUMP_UP_RATIO) {
		const up = p / JUMP_UP_RATIO;
		return JUMP_HEIGHT * (1 - (1 - up) ** 2);
	}
	const down = (p - JUMP_UP_RATIO) / (1 - JUMP_UP_RATIO);
	return JUMP_HEIGHT * (1 - down ** 2);
}

export function restFrame(state: RobotState): Frame {
	return {
		robot: {
			layer: state.layer,
			x: state.x,
			y: state.y,
			angle: DIRECTION_ANGLES[state.direction],
			scale: state.visible ? 1 : 0,
			lift: 0,
		},
		orb: null,
		key: null,
	};
}

/*
 * stepを動かし始めてからelapsed秒の姿
 * 始まった区切り（elapsedがstartより後）だけを順に当てはめ、終わった区切りは終わりの姿にする
 */
export function frameAt(from: RobotState, step: Step, motion: Motion, elapsed: number): Frame {
	const frame = restFrame({ ...from, visible: true });
	const robot = { ...frame.robot };
	let orb: Frame["orb"] = null;
	// 鍵は、上がり始めるまではマスに置いたままの姿で描く（迷路からは外してある）
	let key: Frame["key"] =
		step.tookKey === true
			? { layer: step.layer, x: step.x, y: step.y, lift: 0, angle: 0, scale: 1 }
			: null;
	const startAngle = robot.angle;

	for (const phase of motion.phases) {
		if (elapsed <= phase.start && phase.start > 0) break;
		const p = Math.min(1, Math.max(0, (elapsed - phase.start) / (phase.end - phase.start)));
		const done = p >= 1;
		switch (phase.kind) {
			case "move":
				robot.x = lerp(from.x, step.x, easeInOut(p));
				robot.y = lerp(from.y, step.y, easeInOut(p));
				break;
			case "turn": {
				// 右は時計回り（上から見て角度が減る向き）、左は反時計回り
				const quarter = RIGHT_OF[from.direction] === step.direction ? -Math.PI / 2 : Math.PI / 2;
				robot.angle = startAngle + quarter * easeInOut(p);
				break;
			}
			case "stay":
				break;
			case "fill":
				// 球が大きくなりきったら、穴は床に変わる（次のターンの迷路で床にする）ので球を消す
				orb = done || step.filled === undefined ? null : { ...step.filled, scale: p };
				break;
			case "vanish":
				// だんだん速く回りながら縮み、少し浮いて消える
				robot.scale = 1 - p;
				robot.angle = startAngle + FULL_TURN * WARP_TURNS * p ** 2;
				robot.lift = WARP_LIFT * p;
				break;
			case "appear":
				// 隣の階の少し上に現れ、だんだん遅く回りながら大きくなって降りる（回る回数は合わせて整数なので向きは戻る）
				robot.layer = step.layer;
				robot.scale = p;
				robot.angle = startAngle + FULL_TURN * WARP_TURNS * (1 + 1 - (1 - p) ** 2);
				robot.lift = done ? 0 : WARP_LIFT * (1 - p);
				break;
			case "key":
				if (key !== null) {
					// 前半で真上へ上がり、後半で1回転しながら小さくなって消える
					const rise = Math.min(1, p * 2);
					const spin = Math.max(0, p * 2 - 1);
					key = done
						? null
						: {
								...key,
								lift: KEY_RISE * easeInOut(rise),
								angle: FULL_TURN * spin,
								scale: 1 - spin ** 3,
							};
				}
				break;
			case "spin":
				robot.angle = startAngle + FULL_TURN * easeInOut(p);
				break;
			case "jump":
				robot.angle = startAngle;
				robot.lift = done ? 0 : jumpLift(p);
				break;
			case "fall":
				robot.angle = startAngle + FULL_TURN * FALL_TURNS * p;
				robot.scale = 1 - p;
				robot.lift = -FALL_DEPTH * p;
				break;
		}
	}

	return { robot, orb, key };
}

// 準備の動きの1回の跳ねの長さ（秒）と高さ
const HOP_SECONDS = 0.4;
const HOP_HEIGHT = 0.12;

// 結果が届くまで、その場で小さく跳ねる
export function preparingFrame(state: RobotState, elapsed: number): Frame {
	const frame = restFrame(state);
	return {
		...frame,
		robot: {
			...frame.robot,
			lift: HOP_HEIGHT * Math.abs(Math.sin((Math.PI * elapsed) / HOP_SECONDS)),
		},
	};
}
