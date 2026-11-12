/*
 * テレポートの光の演出（仕様書README.mdの「1ターンの動き」のteleported）
 * 「テレポートのマスへ進んだ後、縮んで消える。回す中心が隣の階へ移り、同じ行・列に現れる」の間、
 * 元の階と移る先の階をつなぐ光の柱を立て、消えるときは元の床に、現れるときは先の床に光の輪を広げる
 */
import { TUTORIALS, compile } from "@kasane/core";
import type { Maze, Step } from "@kasane/core";
import { describe, expect, it } from "vitest";

import { frameAt, stepMotion } from "./robot-motion";
import { robotAt } from "./run-playback";
import { DIRECTION_ANGLES } from "./scene-layout";
import { warpAt, warpLook } from "./warp";

const MAZE: Maze = TUTORIALS[4]?.maze ?? { layers: [], startDirection: "east" };
const { steps } = compile(MAZE, [
	{ type: "repeat", times: 3, body: [{ type: "forward" }] },
	{ type: "right" },
	{ type: "repeat", times: 3, body: [{ type: "forward" }] },
]);
const TURN = steps.findIndex((step) => step.teleported === true);
const STEP = steps[TURN] as Step;
const FROM = robotAt(MAZE, steps, TURN);
const MOTION = stepMotion(STEP, false);

function phase(kind: "move" | "vanish" | "appear") {
	const found = MOTION.phases.find((candidate) => candidate.kind === kind);
	if (found === undefined) throw new Error(`${kind}がない`);
	return found;
}

function middle(kind: "move" | "vanish" | "appear"): number {
	const { start, end } = phase(kind);
	return (start + end) / 2;
}

describe("warpAt", () => {
	it("テレポートしないstepでは出さない", () => {
		const [first] = steps;
		if (first === undefined) throw new Error("stepがない");
		const motion = stepMotion(first, false);

		expect(warpAt(robotAt(MAZE, steps, 0), first, motion, motion.duration / 2)).toBeNull();
	});

	it("テレポートのマスへ進む間は、まだ出さない", () => {
		expect(warpAt(FROM, STEP, MOTION, middle("move"))).toBeNull();
	});

	it("縮んで消える間は、元の階のテレポートのマスから、移る先の階の同じ行・列へ向かう", () => {
		const warp = warpAt(FROM, STEP, MOTION, middle("vanish"));

		expect(warp).toMatchObject({
			up: true,
			from: { layer: 0, x: 3, y: 3 },
			to: { layer: 1, x: 3, y: 3 },
			stage: "vanish",
		});
		expect(warp?.progress).toBeCloseTo(0.5);
	});

	it("現れる間は、現れる段階として進み具合を返す", () => {
		const warp = warpAt(FROM, STEP, MOTION, middle("appear"));

		expect(warp?.stage).toBe("appear");
		expect(warp?.progress).toBeCloseTo(0.5);
	});

	it("現れ終わったら出さない", () => {
		expect(warpAt(FROM, STEP, MOTION, MOTION.duration)).toBeNull();
	});

	it("下へのテレポートでは、upが偽になる", () => {
		const down: Step = { ...STEP, layer: 0 };
		const from = { ...FROM, layer: 1 };

		expect(warpAt(from, down, MOTION, middle("vanish"))).toMatchObject({
			up: false,
			from: { layer: 1 },
			to: { layer: 0 },
		});
	});
});

describe("warpLook", () => {
	it("光の柱は、消える間に濃くなり、現れる間に薄くなって消える", () => {
		expect(warpLook("vanish", 0).beamOpacity).toBe(0);
		expect(warpLook("vanish", 1).beamOpacity).toBeCloseTo(1);
		expect(warpLook("appear", 0).beamOpacity).toBeCloseTo(1);
		expect(warpLook("appear", 1).beamOpacity).toBeCloseTo(0);
	});

	it("光の輪は、消えるときは元の床に、現れるときは先の床に広がる", () => {
		expect(warpLook("vanish", 0.5).burstAt).toBe("from");
		expect(warpLook("appear", 0.5).burstAt).toBe("to");
		expect(warpLook("vanish", 0.8).burstScale).toBeGreaterThan(warpLook("vanish", 0.2).burstScale);
	});

	it("光の粒は、元の階から先の階へ進む（消える間に半分、現れる間に残りの半分）", () => {
		expect(warpLook("vanish", 0).travel).toBe(0);
		expect(warpLook("vanish", 1).travel).toBeCloseTo(0.5);
		expect(warpLook("appear", 1).travel).toBeCloseTo(1);
	});

	it("濃さは0〜1に収まる", () => {
		for (const stage of ["vanish", "appear"] as const) {
			for (let index = 0; index <= 20; index += 1) {
				const look = warpLook(stage, index / 20);
				for (const value of [look.beamOpacity, look.burstOpacity]) {
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(1);
				}
			}
		}
	});
});

describe("テレポートのロボットの動き（frameAt）", () => {
	it("縮んで消える間は、回りながら少し浮く", () => {
		const robot = frameAt(FROM, STEP, MOTION, middle("vanish")).robot;

		expect(robot.lift).toBeGreaterThan(0);
		expect(robot.angle).not.toBeCloseTo(DIRECTION_ANGLES[FROM.direction]);
	});

	it("現れる間は、回りながら降りてきて、現れ終わると床に立つ", () => {
		const appearing = frameAt(FROM, STEP, MOTION, middle("appear")).robot;
		const landed = frameAt(FROM, STEP, MOTION, phase("appear").end).robot;

		expect(appearing.lift).toBeGreaterThan(0);
		expect(landed.lift).toBe(0);
	});

	it("消える・現れるは、それぞれ0.6秒かける", () => {
		expect(phase("vanish").end - phase("vanish").start).toBeCloseTo(0.6);
		expect(phase("appear").end - phase("appear").start).toBeCloseTo(0.6);
	});
});
