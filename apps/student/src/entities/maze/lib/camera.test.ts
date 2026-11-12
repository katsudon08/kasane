/*
 * 迷路の3Dのカメラ（仕様書README.mdの「迷路の3D」）
 * - 児童が指で迷路の中心を軸に回す
 * - 開いたときのカメラは、斜め上から全階が見える角度
 * - ズームは、迷路全体が画面に収まる距離を上限、迷路が画面の3分の1ほどになる距離を下限にする
 *   （下限は、迷路のおよそ3分の1が画面に収まるまで近づける距離と読む。上限の距離の3分の1）
 */
import { describe, expect, it } from "vitest";

import { cameraRange, initialCameraPosition, mazeBounds } from "./camera";
import { LAYER_GAP, WALL_HEIGHT, cellCenter, layerLabelPosition } from "./scene-layout";
import type { Vec3 } from "./scene-layout";

const SIZES = [5, 6, 7];
const LAYER_COUNTS = [1, 2, 3];
const FOV = 40;

function distance(a: Vec3, b: Vec3): number {
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

describe("mazeBounds", () => {
	const cases = SIZES.flatMap((size) => LAYER_COUNTS.map((layerCount) => ({ size, layerCount })));

	// 迷路全体として球に入れる点: すべての階のマスの角（床と壁の上）と「1F」の文字
	function mazePoints(size: number, layerCount: number): Vec3[] {
		const half = size / 2;
		const points: Vec3[] = [];
		for (let layer = 0; layer < layerCount; layer++) {
			const [, floorY] = cellCenter(size, { layer, y: 0, x: 0 });
			for (const x of [-half, half]) {
				for (const z of [-half, half]) {
					points.push([x, floorY, z], [x, floorY + WALL_HEIGHT, z]);
				}
			}
			points.push(layerLabelPosition(size, layer));
		}
		return points;
	}

	// 「1F」の文字の板の大きさ（中心から端まで）を見込んだ、球の余り
	const LABEL_ALLOWANCE = 1;

	it.each(cases)(
		"一辺$size・$layerCount階の迷路の、すべての階のマスの角と壁の上と「1F」の文字が球に入る",
		({ size, layerCount }) => {
			const { center, radius } = mazeBounds(size, layerCount);

			for (const point of mazePoints(size, layerCount)) {
				expect(distance(center, point)).toBeLessThanOrEqual(radius);
			}
		},
	);

	it.each(cases)(
		"一辺$size・$layerCount階の迷路の球は、いちばん遠い点より大きすぎない",
		({ size, layerCount }) => {
			const { center, radius } = mazeBounds(size, layerCount);
			const farthest = Math.max(
				...mazePoints(size, layerCount).map((point) => distance(center, point)),
			);

			expect(radius).toBeLessThanOrEqual(farthest + LABEL_ALLOWANCE);
		},
	);

	it("中心は、1階の床からいちばん上の階の壁の上までの間にある", () => {
		const { center } = mazeBounds(7, 3);

		expect(center[1]).toBeGreaterThan(0);
		expect(center[1]).toBeLessThan(2 * LAYER_GAP + WALL_HEIGHT);
	});

	it("階が増えると、球が大きくなる", () => {
		expect(mazeBounds(5, 2).radius).toBeGreaterThan(mazeBounds(5, 1).radius);
		expect(mazeBounds(5, 3).radius).toBeGreaterThan(mazeBounds(5, 2).radius);
	});
});

describe("cameraRange", () => {
	it("横長の画面では、上限の距離で球が縦の視野にちょうど収まる", () => {
		const { maxDistance } = cameraRange(5, FOV, 16 / 9);

		expect(5 / maxDistance).toBeCloseTo(Math.sin(toRadians(FOV) / 2), 6);
	});

	it("縦長の画面では、上限の距離で球が横の視野にちょうど収まる", () => {
		const aspect = 3 / 4;
		const horizontalFov = 2 * Math.atan(Math.tan(toRadians(FOV) / 2) * aspect);
		const { maxDistance } = cameraRange(5, FOV, aspect);

		expect(5 / maxDistance).toBeCloseTo(Math.sin(horizontalFov / 2), 6);
	});

	it("縦長の画面ほど、上限の距離が遠い", () => {
		expect(cameraRange(5, FOV, 3 / 4).maxDistance).toBeGreaterThan(
			cameraRange(5, FOV, 4 / 3).maxDistance,
		);
	});

	it("下限の距離は、上限の距離の3分の1", () => {
		const { minDistance, maxDistance } = cameraRange(5, FOV, 4 / 3);

		expect(minDistance).toBeCloseTo(maxDistance / 3, 6);
	});
});

describe("initialCameraPosition", () => {
	const center: Vec3 = [0, 2, 0];
	const position = initialCameraPosition(center, 20);

	it("迷路の中心から、渡した距離だけ離れる", () => {
		expect(distance(center, position)).toBeCloseTo(20);
	});

	it("斜め上（水平から30〜60度）から見下ろす", () => {
		const horizontal = Math.hypot(position[0] - center[0], position[2] - center[2]);
		const elevation = Math.atan2(position[1] - center[1], horizontal);

		expect(elevation).toBeGreaterThan(toRadians(30));
		expect(elevation).toBeLessThan(toRadians(60));
	});

	it("southの側（手前）から見るので、northが奥になり2Dのマス目と同じ向きで見える", () => {
		expect(position[2]).toBeGreaterThan(center[2]);
	});
});
