/*
 * テレポートの光の柱の形と材質（仕様書README.mdの「1ターンの動き」のteleported、backend.mdの「3D（React Three Fiber）」）
 * 色はテレポートの矢印に合わせ、上へは赤、下へは青にする
 * 光は材質の発光と、色を足し合わせる重ね方（加算合成）だけで描き、後処理（ブルーム）は使わない
 * 柱が出るのはテレポートのターンの間だけで、同時に二つは出ないので、材質の濃さと模様の位置はuseFrameの中で書き換えてよい
 * テレポートのマスは壁にはさまれた通路にあることが多く、上から見ると柱が壁に隠れるので、壁より手前に重ねて描く（深さを比べない）
 */
import {
	AdditiveBlending,
	CanvasTexture,
	CylinderGeometry,
	DoubleSide,
	MeshStandardMaterial,
	RepeatWrapping,
	RingGeometry,
	SRGBColorSpace,
	SphereGeometry,
	TorusGeometry,
} from "three";

// 形（高さ1。下の端を原点に置き、上へ伸ばす）

export const BEAM_GEOMETRY = new CylinderGeometry(0.38, 0.38, 1, 32, 1, true).translate(0, 0.5, 0);
export const BEAM_CORE_GEOMETRY = new CylinderGeometry(0.1, 0.1, 1, 16, 1, true).translate(
	0,
	0.5,
	0,
);
// 床に寝かせた光の輪
export const BURST_GEOMETRY = new RingGeometry(0.32, 0.44, 48)
	.rotateX(-Math.PI / 2)
	.translate(0, 0.03, 0);
// 柱にそって進む輪
export const SWIRL_GEOMETRY = new TorusGeometry(0.45, 0.02, 8, 48).rotateX(Math.PI / 2);
export const WARP_SPARK_GEOMETRY = new SphereGeometry(0.035, 8, 6);
// 柱のまわりをらせんに進む光の粒の数
export const WARP_SPARK_COUNT = 16;

// 柱の模様: 縦に流れる光の筋。くり返して貼り、位置をずらして流す
function streakTexture(): CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = 64;
	canvas.height = 256;
	const context = canvas.getContext("2d");
	if (context === null) throw new Error("2Dの描画ができない");
	const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
	for (const [stop, alpha] of [
		[0, 0.15],
		[0.2, 0.9],
		[0.35, 0.25],
		[0.55, 0.7],
		[0.7, 0.1],
		[0.85, 0.6],
		[1, 0.15],
	] as const) {
		gradient.addColorStop(stop, `rgba(255, 255, 255, ${alpha})`);
	}
	context.fillStyle = gradient;
	context.fillRect(0, 0, canvas.width, canvas.height);
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	texture.wrapS = RepeatWrapping;
	texture.wrapT = RepeatWrapping;
	texture.repeat.set(1, 2);
	return texture;
}

export const STREAK_TEXTURE = streakTexture();

export type WarpMaterials = {
	beam: MeshStandardMaterial;
	core: MeshStandardMaterial;
	burst: MeshStandardMaterial;
	swirl: MeshStandardMaterial;
	spark: MeshStandardMaterial;
};

// 光を足し合わせて重ねる材質。深さを書き込まず、比べもしない（壁に隠れない）
function additive(
	emissive: string,
	intensity: number,
	texture: CanvasTexture | null = null,
): MeshStandardMaterial {
	return new MeshStandardMaterial({
		color: "#000000",
		map: texture,
		emissive,
		emissiveMap: texture,
		emissiveIntensity: intensity,
		transparent: true,
		opacity: 1,
		blending: AdditiveBlending,
		depthWrite: false,
		depthTest: false,
		toneMapped: false,
		side: DoubleSide,
	});
}

function warpMaterials(main: string, light: string): WarpMaterials {
	return {
		beam: additive(main, 1.4, STREAK_TEXTURE),
		core: additive(light, 1.6, STREAK_TEXTURE),
		burst: additive(main, 1.4),
		swirl: additive(light, 1.4),
		spark: additive(light, 1.8),
	};
}

// テレポートの矢印（parts.tsのteleportUp・teleportDown）と同じ色の系統
export const WARP_UP_MATERIALS = warpMaterials("#ff3b3b", "#ffa8a8");
export const WARP_DOWN_MATERIALS = warpMaterials("#339af0", "#a5d8ff");
