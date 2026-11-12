/*
 * 迷路の3Dのカメラ（仕様書README.mdの「迷路の3D」）
 * 迷路全体を包む球を求め、その球が画面に収まる距離をズームの上限、その3分の1を下限にする
 */
import { LAYER_GAP, WALL_HEIGHT, layerLabelPosition } from "./scene-layout";
import type { Vec3 } from "./scene-layout";

export type Bounds = { center: Vec3; radius: number };

// 「1F」の文字の板の中心から端までの長さ。文字の中心のまわりにこのぶん球を大きくする
const LABEL_RADIUS = 0.9;

export function mazeBounds(size: number, layerCount: number): Bounds {
	const top = (layerCount - 1) * LAYER_GAP + WALL_HEIGHT;
	const center: Vec3 = [0, top / 2, 0];
	const half = size / 2;
	// 迷路の角（x, zとも±half）と、1階の床・いちばん上の階の壁の上
	const corner = Math.hypot(half, half, top / 2);
	// 各階の文字のうち、中心からいちばん遠いもの
	const label = Math.max(
		...Array.from({ length: layerCount }, (_, layer) => {
			const [x, y, z] = layerLabelPosition(size, layer);
			return Math.hypot(x, y - center[1], z) + LABEL_RADIUS;
		}),
	);
	return { center, radius: Math.max(corner, label) };
}

export type CameraRange = { minDistance: number; maxDistance: number };

// fovは縦の視野角（度）、aspectは画面の幅÷高さ
export function cameraRange(radius: number, fov: number, aspect: number): CameraRange {
	const verticalHalf = (fov * Math.PI) / 360;
	const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect);
	// 狭いほうの視野に球が収まる距離
	const maxDistance = radius / Math.sin(Math.min(verticalHalf, horizontalHalf));
	return { minDistance: maxDistance / 3, maxDistance };
}

// 水平から見下ろす角度。壁（高さ1）の奥のマスが隠れすぎないよう、斜め上の範囲で高めにする
const ELEVATION = (58 * Math.PI) / 180;

// south（手前、+z）の側の斜め上
export function initialCameraPosition(center: Vec3, distance: number): Vec3 {
	return [
		center[0],
		center[1] + distance * Math.sin(ELEVATION),
		center[2] + distance * Math.cos(ELEVATION),
	];
}
