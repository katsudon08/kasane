/*
 * ロボットの1ターンの動き（仕様書README.mdの「ロボットを動かす」の「1ターンの動き」の表）
 * stepsを1ターン1秒でなぞる。テレポート・鍵・ゴール・落ちるは、進んだ後に続けてその動きをする
 * 3Dは、ここで求めた各時刻の姿（位置・向き・大きさ・高さ）をuseFrameの中でrefに書き込む
 */
import { FLOOR, GOAL, HOLE, KEY, START, TUTORIALS, WALL, compile } from "@kasane/core";
import type { Command, Maze, Step } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { preparingFrame, restFrame, frameAt, stepMotion, TURN_SECONDS } from "./robot-motion";
import type { Frame } from "./robot-motion";
import { robotAt } from "./run-playback";
import type { RobotState } from "./run-playback";
import { DIRECTION_ANGLES } from "./scene-layout";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const left: Command = { type: "left" };
const fill: Command = { type: "fill" };

const W = WALL;
const F = FLOOR;

const MAZE: Maze = {
	startDirection: "east",
	layers: [
		[
			[START, HOLE, F, KEY, GOAL],
			[F, W, W, W, W],
			[W, W, W, W, W],
			[W, W, W, W, W],
			[W, W, W, W, W],
		],
	],
};

function tutorialMaze(no: number): Maze {
	const tutorial = TUTORIALS[no - 1];
	if (tutorial === undefined) throw new Error(`チュートリアル${no}がない`);
	return tutorial.maze;
}

function stepOf(steps: Step[], index: number): Step {
	const step = steps[index];
	if (step === undefined) throw new Error(`${index}個目のstepがない`);
	return step;
}

// 角度は一周の差を無視して比べる
function sameAngle(actual: number, expected: number): boolean {
	const turn = Math.PI * 2;
	const difference = (((actual - expected) % turn) + turn) % turn;
	return difference < 1e-9 || turn - difference < 1e-9;
}

function phaseKinds(step: Step, celebrate = false): string[] {
	return stepMotion(step, celebrate).phases.map((phase) => phase.kind);
}

// stepの前の状態と、そのstepの動きの全部が終わったときの姿
function endsAt(maze: Maze, steps: Step[], index: number, celebrate = false): [Frame, RobotState] {
	const step = stepOf(steps, index);
	const motion = stepMotion(step, celebrate);
	const frame = frameAt(robotAt(maze, steps, index), step, motion, motion.duration);
	return [frame, robotAt(maze, steps, index + 1)];
}

describe("stepMotion", () => {
	it("move・turn・fillは、1ターン1秒", () => {
		const { steps } = compile(MAZE, [fill, forward, right]);

		expect(TURN_SECONDS).toBe(1);
		expect(phaseKinds(stepOf(steps, 0))).toEqual(["fill"]);
		expect(phaseKinds(stepOf(steps, 1))).toEqual(["move"]);
		expect(phaseKinds(stepOf(steps, 2))).toEqual(["turn"]);
		for (const index of [0, 1, 2]) {
			expect(stepMotion(stepOf(steps, index), false).duration).toBeCloseTo(TURN_SECONDS);
		}
	});

	it("fillMissは何も見せず、このターンの時間も使わない", () => {
		const { steps } = compile(MAZE, [right, fill]);
		const motion = stepMotion(stepOf(steps, 1), false);

		expect(stepOf(steps, 1).event).toBe("fillMiss");
		expect(motion.phases).toEqual([]);
		expect(motion.duration).toBe(0);
	});

	it("bumpは動かずに止まる", () => {
		const { steps } = compile(MAZE, [left, forward]);

		expect(stepOf(steps, 1).event).toBe("bump");
		expect(phaseKinds(stepOf(steps, 1))).toEqual(["stay"]);
	});

	it("fallは穴のマスへ進んだ後、回りながら縮んで見えなくなる", () => {
		const { steps } = compile(MAZE, [forward]);

		expect(phaseKinds(stepOf(steps, 0))).toEqual(["move", "fall"]);
	});

	it("tookKeyは鍵のマスへ進んだ後に、鍵が上がって消える", () => {
		const { steps } = compile(MAZE, [fill, forward, forward, forward]);

		expect(stepOf(steps, 3).tookKey).toBe(true);
		expect(phaseKinds(stepOf(steps, 3))).toEqual(["move", "key"]);
	});

	it("goalはゴールのマスへ進んだ後、1回転してから跳ぶ。鍵が残っていれば跳ばない", () => {
		const { steps } = compile(tutorialMaze(1), [forward, forward, forward, forward]);
		const last = stepOf(steps, 3);

		expect(last.event).toBe("goal");
		expect(phaseKinds(last, true)).toEqual(["move", "spin", "jump"]);
		expect(phaseKinds(last, false)).toEqual(["move"]);
	});

	it("teleportedはテレポートのマスへ進んだ後、縮んで消え、隣の階に現れる", () => {
		const maze = tutorialMaze(5);
		const { steps } = compile(maze, [
			{ type: "repeat", times: 3, body: [forward] },
			right,
			{ type: "repeat", times: 3, body: [forward] },
		]);
		const teleported = steps.find((step) => step.teleported === true);
		if (teleported === undefined) throw new Error("テレポートしていない");

		expect(phaseKinds(teleported)).toEqual(["move", "vanish", "appear"]);
	});

	it.each([
		{ name: "鍵", event: "move", tookKey: true, expected: ["move", "vanish", "appear", "key"] },
		{
			name: "ゴール",
			event: "goal",
			tookKey: false,
			expected: ["move", "vanish", "appear", "spin", "jump"],
		},
	] as const)("移った先に$nameがあれば、続けてその動きをする", ({ event, tookKey, expected }) => {
		const step: Step = {
			layer: 1,
			x: 2,
			y: 2,
			direction: "east",
			path: [0],
			event,
			teleported: true,
			tookKey,
		};

		expect(phaseKinds(step, event === "goal")).toEqual(expected);
	});

	it("動きの区切りは隙間なく続き、最後の区切りの終わりが1ターンの長さ", () => {
		const step: Step = {
			layer: 1,
			x: 2,
			y: 2,
			direction: "east",
			path: [0],
			event: "goal",
			teleported: true,
		};
		const { phases, duration } = stepMotion(step, true);

		expect(phases[0]?.start).toBe(0);
		phases.slice(1).forEach((phase, index) => {
			expect(phase.start).toBe(phases[index]?.end);
		});
		expect(phases.at(-1)?.end).toBe(duration);
	});
});

describe("frameAt", () => {
	it("始まりは、前のターンの状態のまま", () => {
		const { steps } = compile(MAZE, [fill, forward]);
		const step = stepOf(steps, 1);
		const from = robotAt(MAZE, steps, 1);

		expect(frameAt(from, step, stepMotion(step, false), 0).robot).toEqual(restFrame(from).robot);
	});

	it.each([
		{ name: "move", program: [fill, forward], index: 1 },
		{ name: "turn（右）", program: [right], index: 0 },
		{ name: "turn（左）", program: [left], index: 0 },
		{ name: "fill", program: [fill], index: 0 },
		{ name: "bump", program: [left, forward], index: 1 },
		{ name: "tookKey", program: [fill, forward, forward, forward], index: 3 },
	])("$nameの終わりは、次のターンの状態と同じ", ({ program, index }) => {
		const { steps } = compile(MAZE, program);
		const [frame, to] = endsAt(MAZE, steps, index);

		expect(frame.robot).toMatchObject({ layer: to.layer, x: to.x, y: to.y, scale: 1, lift: 0 });
		expect(sameAngle(frame.robot.angle, DIRECTION_ANGLES[to.direction])).toBe(true);
	});

	it("ゴールで1回転して跳んだ後は、ゴールのマスに同じ向きで立つ", () => {
		const maze = tutorialMaze(1);
		const { steps } = compile(maze, [forward, forward, forward, forward]);
		const [frame, to] = endsAt(maze, steps, 3, true);

		expect(frame.robot).toMatchObject({ layer: 0, x: to.x, y: to.y, scale: 1, lift: 0 });
		expect(sameAngle(frame.robot.angle, DIRECTION_ANGLES.east)).toBe(true);
	});

	it("テレポートした後は、隣の階の同じ行・列に立つ", () => {
		const maze = tutorialMaze(5);
		const { steps } = compile(maze, [
			{ type: "repeat", times: 3, body: [forward] },
			right,
			{ type: "repeat", times: 3, body: [forward] },
		]);
		const index = steps.findIndex((step) => step.teleported === true);
		const [frame, to] = endsAt(maze, steps, index);

		expect(to.layer).toBe(1);
		expect(frame.robot).toMatchObject({ layer: 1, x: to.x, y: to.y, scale: 1 });
	});

	it("moveの途中は、前のマスと次のマスの間にいる", () => {
		const { steps } = compile(MAZE, [fill, forward]);
		const step = stepOf(steps, 1);
		const frame = frameAt(robotAt(MAZE, steps, 1), step, stepMotion(step, false), TURN_SECONDS / 2);

		expect(frame.robot.x).toBeGreaterThan(0);
		expect(frame.robot.x).toBeLessThan(1);
		expect(frame.robot.y).toBe(0);
	});

	it("右は時計回り（上から見て角度が減る向き）、左は反時計回りに、時間をかけて90度回る", () => {
		const half = TURN_SECONDS / 2;
		const turnRight = compile(MAZE, [right]).steps;
		const turnLeft = compile(MAZE, [left]).steps;
		const from = robotAt(MAZE, [], 0);
		const start = DIRECTION_ANGLES.east;

		const rightAngle = frameAt(
			from,
			stepOf(turnRight, 0),
			stepMotion(stepOf(turnRight, 0), false),
			half,
		).robot.angle;
		const leftAngle = frameAt(
			from,
			stepOf(turnLeft, 0),
			stepMotion(stepOf(turnLeft, 0), false),
			half,
		).robot.angle;

		expect(rightAngle).toBeLessThan(start);
		expect(rightAngle).toBeGreaterThan(start - Math.PI / 2);
		expect(leftAngle).toBeGreaterThan(start);
		expect(leftAngle).toBeLessThan(start + Math.PI / 2);
	});

	it("fillは、ロボットの前の穴のマスに光る球が現れて大きくなり、終わったら消える", () => {
		const { steps } = compile(MAZE, [fill]);
		const step = stepOf(steps, 0);
		const motion = stepMotion(step, false);
		const from = robotAt(MAZE, steps, 0);

		const early = frameAt(from, step, motion, motion.duration * 0.25).orb;
		const late = frameAt(from, step, motion, motion.duration * 0.75).orb;

		expect(early).toMatchObject({ layer: 0, x: 1, y: 0 });
		expect(late).toMatchObject({ layer: 0, x: 1, y: 0 });
		expect(late?.scale ?? 0).toBeGreaterThan(early?.scale ?? 1);
		expect(frameAt(from, step, motion, motion.duration).orb).toBeNull();
	});

	it("tookKeyは、進む間は鍵がマスにあり、その後ロボットの真上へ上がって1回転し、消える", () => {
		const { steps } = compile(MAZE, [fill, forward, forward, forward]);
		const step = stepOf(steps, 3);
		const motion = stepMotion(step, false);
		const from = robotAt(MAZE, steps, 3);
		const keyPhase = motion.phases.find((phase) => phase.kind === "key");
		if (keyPhase === undefined) throw new Error("鍵の動きがない");

		expect(frameAt(from, step, motion, 0).key).toEqual({
			layer: 0,
			x: 3,
			y: 0,
			lift: 0,
			angle: 0,
			scale: 1,
		});
		const rising = frameAt(from, step, motion, (keyPhase.start + keyPhase.end) / 2).key;
		expect(rising).toMatchObject({ layer: 0, x: 3, y: 0 });
		expect(rising?.lift ?? 0).toBeGreaterThan(0);
		expect(frameAt(from, step, motion, motion.duration).key).toBeNull();
	});

	it("鍵を取らないstepでは鍵を描かない", () => {
		const { steps } = compile(MAZE, [right]);
		const step = stepOf(steps, 0);

		expect(frameAt(robotAt(MAZE, steps, 0), step, stepMotion(step, false), 0).key).toBeNull();
	});

	it("テレポートは、元の階で縮んで消えてから、隣の階で大きくなって現れる", () => {
		const maze = tutorialMaze(5);
		const { steps } = compile(maze, [
			{ type: "repeat", times: 3, body: [forward] },
			right,
			{ type: "repeat", times: 3, body: [forward] },
		]);
		const index = steps.findIndex((step) => step.teleported === true);
		const step = stepOf(steps, index);
		const motion = stepMotion(step, false);
		const from = robotAt(maze, steps, index);
		const [, vanish, appear] = motion.phases;
		if (vanish === undefined || appear === undefined) throw new Error("テレポートの動きがない");

		const vanished = frameAt(from, step, motion, vanish.end).robot;
		const appearing = frameAt(from, step, motion, (appear.start + appear.end) / 2).robot;

		expect(vanished).toMatchObject({ layer: 0, x: 3, y: 3, scale: 0 });
		expect(appearing.layer).toBe(1);
		expect(appearing.scale).toBeGreaterThan(0);
		expect(appearing.scale).toBeLessThan(1);
	});

	it("fallは、穴のマスで激しく回りながら縮んで見えなくなる", () => {
		const { steps } = compile(MAZE, [forward]);
		const step = stepOf(steps, 0);
		const motion = stepMotion(step, false);
		const from = robotAt(MAZE, steps, 0);
		const fall = motion.phases.find((phase) => phase.kind === "fall");
		if (fall === undefined) throw new Error("落ちる動きがない");

		const middle = frameAt(from, step, motion, (fall.start + fall.end) / 2).robot;
		const end = frameAt(from, step, motion, motion.duration).robot;

		expect(middle).toMatchObject({ x: 1, y: 0 });
		expect(middle.scale).toBeLessThan(1);
		expect(Math.abs(middle.angle - DIRECTION_ANGLES.east)).toBeGreaterThan(Math.PI / 2);
		expect(end.scale).toBe(0);
	});

	it("ゴールで跳ぶときは、上がりは速く、下りは少しゆっくり", () => {
		const maze = tutorialMaze(1);
		const { steps } = compile(maze, [forward, forward, forward, forward]);
		const step = stepOf(steps, 3);
		const motion = stepMotion(step, true);
		const from = robotAt(maze, steps, 3);
		const jump = motion.phases.find((phase) => phase.kind === "jump");
		if (jump === undefined) throw new Error("跳ぶ動きがない");

		const samples = Array.from({ length: 101 }, (_, index) => {
			const elapsed = jump.start + ((jump.end - jump.start) * index) / 100;
			return frameAt(from, step, motion, elapsed).robot.lift;
		});
		const peak = samples.indexOf(Math.max(...samples));

		expect(Math.max(...samples)).toBeGreaterThan(0);
		expect(samples[0]).toBe(0);
		expect(samples[100]).toBe(0);
		// 頂点までの時間が、頂点から下りるまでの時間より短い
		expect(peak).toBeLessThan(50);
	});

	it("経過時間が長さを超えても、終わりの姿のまま", () => {
		const { steps } = compile(MAZE, [right]);
		const step = stepOf(steps, 0);
		const motion = stepMotion(step, false);
		const from = robotAt(MAZE, steps, 0);

		expect(frameAt(from, step, motion, motion.duration + 5)).toEqual(
			frameAt(from, step, motion, motion.duration),
		);
	});
});

describe("restFrame", () => {
	it("止まっているロボットは、その向きの角度で、高さ0に立つ", () => {
		expect(restFrame({ layer: 1, x: 2, y: 3, direction: "south", visible: true })).toEqual({
			robot: { layer: 1, x: 2, y: 3, angle: DIRECTION_ANGLES.south, scale: 1, lift: 0 },
			orb: null,
			key: null,
		});
	});

	it("落ちた後のロボットは見えない（大きさ0）", () => {
		expect(restFrame({ layer: 0, x: 1, y: 0, direction: "east", visible: false }).robot.scale).toBe(
			0,
		);
	});
});

describe("preparingFrame（結果が届くまでの準備の動き）", () => {
	it("その場で短く動く（位置と向きは変えない）", () => {
		const state: RobotState = { layer: 0, x: 0, y: 0, direction: "east", visible: true };
		const lifts = [0, 0.1, 0.2, 0.3, 0.4].map((elapsed) => preparingFrame(state, elapsed).robot);

		for (const robot of lifts) {
			expect(robot).toMatchObject({ layer: 0, x: 0, y: 0, angle: DIRECTION_ANGLES.east, scale: 1 });
			expect(robot.lift).toBeGreaterThanOrEqual(0);
		}
		expect(new Set(lifts.map((robot) => robot.lift)).size).toBeGreaterThan(1);
	});
});
