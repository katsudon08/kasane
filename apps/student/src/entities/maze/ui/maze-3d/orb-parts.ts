/*
 * 穴をうめるときの光る球の形と材質（仕様書README.mdの「1ターンの動き」のfill、backend.mdの「3D（React Three Fiber）」）
 * 芯・外側の殻・ぼんやりした光・回る輪・光の粒・床に広がる光の輪を重ねる
 * 光は材質の発光と、色を足し合わせる重ね方（加算合成）だけで描き、後処理（ブルーム）は使わない
 * 球が出るのはうめるターンの間だけで、同時に二つは出ないので、材質の濃さはuseFrameの中で書き換えてよい
 */
import {
	AdditiveBlending,
	DoubleSide,
	MeshStandardMaterial,
	PlaneGeometry,
	RingGeometry,
	SphereGeometry,
	TorusGeometry,
} from "three";

import { SOFT_GLOW_TEXTURE } from "./parts";

// 形（大きさ1のとき）

export const ORB_CORE_GEOMETRY = new SphereGeometry(0.2, 32, 16);
export const ORB_SHELL_GEOMETRY = new SphereGeometry(0.3, 32, 16);
// カメラのほうを向けて置く、ぼんやりした光の板
export const ORB_GLOW_GEOMETRY = new PlaneGeometry(1.4, 1.4);
export const ORB_RING_GEOMETRY = new TorusGeometry(0.4, 0.012, 8, 64);
export const ORB_SPARK_GEOMETRY = new SphereGeometry(0.03, 8, 6);
// 光の粒の数
export const ORB_SPARK_COUNT = 10;
// 床に寝かせた光の輪
export const ORB_SHOCK_GEOMETRY = new RingGeometry(0.36, 0.42, 48)
	.rotateX(-Math.PI / 2)
	.translate(0, 0.03, 0);

// 材質

// 光を足し合わせて重ねる材質。奥の物を隠さないように深さを書き込まない
function additive(emissive: string, intensity: number, opacity: number): MeshStandardMaterial {
	return new MeshStandardMaterial({
		color: "#000000",
		emissive,
		emissiveIntensity: intensity,
		transparent: true,
		opacity,
		blending: AdditiveBlending,
		depthWrite: false,
		toneMapped: false,
	});
}

// 芯: 白に近い、いちばん明るい部分
export const ORB_CORE_MATERIAL = new MeshStandardMaterial({
	color: "#ffffff",
	emissive: "#d0ebff",
	emissiveIntensity: 1.1,
	toneMapped: false,
});
// 殻: 芯を包む青白い光
export const ORB_SHELL_MATERIAL = additive("#339af0", 0.9, 0.5);
// ぼんやりした光: 外へにじんで消える模様の板
export const ORB_GLOW_MATERIAL = new MeshStandardMaterial({
	color: "#000000",
	map: SOFT_GLOW_TEXTURE,
	emissive: "#1c7ed6",
	emissiveMap: SOFT_GLOW_TEXTURE,
	emissiveIntensity: 1.1,
	transparent: true,
	blending: AdditiveBlending,
	depthWrite: false,
	toneMapped: false,
	side: DoubleSide,
});
export const ORB_RING_MATERIAL = additive("#74c0fc", 1.2, 0.85);
export const ORB_SPARK_MATERIAL = additive("#a5d8ff", 1.5, 1);
export const ORB_SHOCK_MATERIAL = new MeshStandardMaterial({
	color: "#000000",
	emissive: "#4dabf7",
	emissiveIntensity: 1.3,
	transparent: true,
	blending: AdditiveBlending,
	depthWrite: false,
	toneMapped: false,
	side: DoubleSide,
});
