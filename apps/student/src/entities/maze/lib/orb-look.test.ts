/*
 * 穴をうめるときの光る球の見た目（仕様書README.mdの「1ターンの動き」のfill）
 * 「ロボットの前に青白く光る球が現れて大きくなり、前の穴が床に変わる」を、前半で現れて大きくなり、
 * 後半で穴へ沈んで床に光の輪が広がる動きにする。光は材質の発光だけで描く（後処理は使わない）
 */
import { describe, expect, it } from "vitest";

import { orbLook } from "./orb-look";

const samples = Array.from({ length: 101 }, (_, index) => index / 100);

describe("orbLook", () => {
	it("始まりは見えない大きさで、穴の上に浮いている", () => {
		const look = orbLook(0);

		expect(look.coreScale).toBe(0);
		expect(look.glowOpacity).toBe(0);
		expect(look.height).toBeGreaterThan(0);
		expect(look.shockOpacity).toBe(0);
	});

	it("前半で大きくなる（途中で少し大きくなりすぎてから戻る）", () => {
		const grow = samples.filter((p) => p <= 0.55).map((p) => orbLook(p).coreScale);
		const peak = Math.max(...grow);

		expect(peak).toBeGreaterThan(1);
		// 大きくなった後は脈打つので、決めた大きさの前後1割に収まる
		expect(Math.abs((grow.at(-1) ?? 0) - 1)).toBeLessThan(0.1);
	});

	it("後半で穴へ沈み、小さくなって、床に光の輪が広がる", () => {
		const middle = orbLook(0.55);
		const sinking = orbLook(0.8);
		const end = orbLook(1);

		expect(sinking.height).toBeLessThan(middle.height);
		expect(end.height).toBeCloseTo(0);
		expect(end.coreScale).toBeLessThan(middle.coreScale);
		expect(sinking.shockScale).toBeGreaterThan(0);
		expect(end.shockScale).toBeGreaterThan(sinking.shockScale);
		expect(end.shockOpacity).toBeCloseTo(0);
	});

	it("光の輪は沈み始めるまで出ない", () => {
		for (const p of samples.filter((value) => value <= 0.55)) {
			expect(orbLook(p).shockOpacity).toBe(0);
		}
	});

	it("大きさと濃さは負にならず、濃さは1を超えない", () => {
		for (const p of samples) {
			const look = orbLook(p);
			for (const value of [look.coreScale, look.glowScale, look.ringScale, look.sparkScale]) {
				expect(value).toBeGreaterThanOrEqual(0);
			}
			for (const value of [look.glowOpacity, look.shockOpacity]) {
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThanOrEqual(1);
			}
		}
	});

	it("範囲の外の値は、始まりと終わりにそろえる", () => {
		expect(orbLook(-1)).toEqual(orbLook(0));
		expect(orbLook(2)).toEqual(orbLook(1));
	});
});
