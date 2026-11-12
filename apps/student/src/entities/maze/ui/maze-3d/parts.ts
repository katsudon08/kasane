/*
 * 迷路の3Dのマスの形と材質（仕様書README.mdの「迷路の3D」、backend.mdの「3D（React Three Fiber）」）
 * ジオメトリとマテリアルはモジュールの定数にして使い回す。光る表現は材質の発光（emissive）だけで行う
 * 形は、マスの中心（床のタイルの上面）を原点に置いたときの位置にあらかじめ動かしておく（置くときは平行移動だけにする）
 */
import {
	BoxGeometry,
	CanvasTexture,
	CircleGeometry,
	CylinderGeometry,
	DoubleSide,
	ExtrudeGeometry,
	MeshStandardMaterial,
	PlaneGeometry,
	SRGBColorSpace,
	Shape,
	ShapeGeometry,
	TorusGeometry,
} from "three";

import { WALL_HEIGHT } from "../../lib/scene-layout";

const TILE_THICKNESS = 0.1;

// 形

// 床のタイル。上面が原点の高さ
export const TILE_GEOMETRY = new BoxGeometry(1, TILE_THICKNESS, 1).translate(
	0,
	-TILE_THICKNESS / 2,
	0,
);

// 壁。隣り合う壁との間に隙間を作らないよう、1マスの大きさちょうどにする。下は床のタイルの下面にそろえる
export const WALL_GEOMETRY = new BoxGeometry(1, WALL_HEIGHT + TILE_THICKNESS, 1).translate(
	0,
	(WALL_HEIGHT - TILE_THICKNESS) / 2,
	0,
);

/*
 * 穴（ブラックホール）。黒い円の上に、オレンジに光る輪を少し浮かせて重ねる
 * 輪は、外へぼやけて広がる光の模様を板に描く（後処理のブルームを使わずに、光がにじんで見えるようにする）
 */
export const HOLE_GEOMETRY = new CircleGeometry(0.32, 32)
	.rotateX(-Math.PI / 2)
	.translate(0, 0.005, 0);
export const HOLE_GLOW_GEOMETRY = new PlaneGeometry(1, 1)
	.rotateX(-Math.PI / 2)
	.translate(0, 0.06, 0);

// スタートの「＜」の形の矢印。+xを向き、床に寝かせる（向きは置くときにy軸まわりに回す）
function chevronShape(): Shape {
	return new Shape()
		.moveTo(0.3, 0)
		.lineTo(-0.05, 0.3)
		.lineTo(-0.2, 0.3)
		.lineTo(0.15, 0)
		.lineTo(-0.2, -0.3)
		.lineTo(-0.05, -0.3)
		.closePath();
}
export const START_GEOMETRY = new ShapeGeometry(chevronShape())
	.rotateX(-Math.PI / 2)
	.translate(0, 0.01, 0);

// ゴールの緑の旗。旗竿と、竿の上の三角の旗
const POLE_HEIGHT = 0.8;
export const FLAG_POLE_GEOMETRY = new CylinderGeometry(0.025, 0.025, POLE_HEIGHT, 12).translate(
	-0.15,
	POLE_HEIGHT / 2,
	0,
);
export const FLAG_GEOMETRY = new ExtrudeGeometry(
	new Shape().moveTo(0, 0).lineTo(0.4, -0.13).lineTo(0, -0.26).closePath(),
	{ depth: 0.02, bevelEnabled: false },
).translate(-0.15, POLE_HEIGHT, -0.01);

/*
 * テレポートの矢印。棒は線ではなく幅のある長方形。厚みを持たせ、カメラのほうへ向けて立てる
 * 上向き（下向きは置くときに180度回す）で、矢印の中心が原点
 */
function arrowShape(): Shape {
	return new Shape()
		.moveTo(-0.1, -0.3)
		.lineTo(0.1, -0.3)
		.lineTo(0.1, 0)
		.lineTo(0.25, 0)
		.lineTo(0, 0.3)
		.lineTo(-0.25, 0)
		.lineTo(-0.1, 0)
		.closePath();
}
export const ARROW_GEOMETRY = new ExtrudeGeometry(arrowShape(), {
	depth: 0.08,
	bevelEnabled: false,
}).translate(0, 0, -0.04);
// 矢印の後ろに置く、ぼやけて広がる光の板
export const ARROW_GLOW_GEOMETRY = new PlaneGeometry(1, 1).translate(0, 0, -0.06);
// 矢印の中心を置く高さ
export const ARROW_HEIGHT = 0.5;

// 金色のウォード錠の鍵。持ち手は輪（トーラス）、軸の先に歯。置くときに斜めに傾ける
// 傾けても鍵がマスの真ん中に残るよう、鍵全体の真ん中（歯の下端から輪の上端までの中ほど）を原点にする
export const KEY_RING_GEOMETRY = new TorusGeometry(0.11, 0.035, 12, 32).translate(0, 0.16, 0);
export const KEY_SHAFT_GEOMETRY = new CylinderGeometry(0.03, 0.03, 0.36, 12).translate(0, -0.12, 0);
export const KEY_TEETH_GEOMETRY = new BoxGeometry(0.1, 0.1, 0.04).translate(0.06, -0.24, 0);
// 鍵の真ん中を置く高さ。傾けても歯の先が床に付かない
export const KEY_HEIGHT = 0.45;

// 「1F」「2F」の文字を貼る板（横:縦 = 2:1。文字を描いた絵と同じ比）
export const LABEL_GEOMETRY = new PlaneGeometry(1.6, 0.8);

// 模様

// 毎回同じ模様になるように、決まった並びの乱数で描く
function pseudoRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state / 2147483648;
	};
}

function canvas2d(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext("2d");
	if (context === null) throw new Error("2Dの描画ができない");
	return [canvas, context];
}

// コンクリートのざらつき
function speckle(context: CanvasRenderingContext2D, size: number, seed: number): void {
	const random = pseudoRandom(seed);
	for (let i = 0; i < 600; i++) {
		const shade = Math.floor(random() * 40) - 20;
		context.fillStyle =
			shade > 0 ? `rgba(255,255,255,${shade / 200})` : `rgba(0,0,0,${-shade / 200})`;
		context.fillRect(random() * size, random() * size, 2, 2);
	}
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	return texture;
}

// 床: コンクリートのタイル。枠線でマス目が分かるようにし、ひび割れの模様を入れる
function tileTexture(): CanvasTexture {
	const size = 128;
	const [canvas, context] = canvas2d(size);
	context.fillStyle = "#c3c7cc";
	context.fillRect(0, 0, size, size);
	speckle(context, size, 7);
	context.strokeStyle = "#7d838a";
	context.lineWidth = 6;
	context.strokeRect(3, 3, size - 6, size - 6);
	context.strokeStyle = "#9097a0";
	context.lineWidth = 2;
	context.beginPath();
	context.moveTo(20, 30);
	context.lineTo(46, 52);
	context.lineTo(58, 50);
	context.lineTo(80, 78);
	context.moveTo(58, 50);
	context.lineTo(66, 34);
	context.moveTo(92, 96);
	context.lineTo(104, 110);
	context.stroke();
	return toTexture(canvas);
}

// 壁: コンクリートの立方体。隙間には見えない程度に、面の縁だけを少し濃くして立方体の形を分かるようにする
function wallTexture(): CanvasTexture {
	const size = 128;
	const [canvas, context] = canvas2d(size);
	context.fillStyle = "#8a9099";
	context.fillRect(0, 0, size, size);
	speckle(context, size, 13);
	context.strokeStyle = "rgba(0,0,0,0.18)";
	context.lineWidth = 4;
	context.strokeRect(2, 2, size - 4, size - 4);
	return toTexture(canvas);
}

const GLOW_SIZE = 256;
const GLOW_CENTER = GLOW_SIZE / 2;

/*
 * 穴の輪の光。画像の真ん中は透明で、輪のところが明るく、外へぼやけて消える
 * 手前（south）の側を明るくして、ブラックホールの写真のような偏りを付ける
 */
function holeGlowTexture(): CanvasTexture {
	const [canvas, context] = canvas2d(GLOW_SIZE);
	const ring = context.createRadialGradient(
		GLOW_CENTER,
		GLOW_CENTER,
		0,
		GLOW_CENTER,
		GLOW_CENTER,
		GLOW_CENTER,
	);
	ring.addColorStop(0, "rgba(255, 120, 0, 0)");
	ring.addColorStop(0.56, "rgba(255, 120, 0, 0)");
	ring.addColorStop(0.64, "rgba(255, 150, 20, 0.9)");
	ring.addColorStop(0.7, "rgba(255, 210, 120, 1)");
	ring.addColorStop(0.8, "rgba(255, 120, 0, 0.6)");
	ring.addColorStop(1, "rgba(255, 80, 0, 0)");
	context.fillStyle = ring;
	context.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);

	// 明るい側。輪の形からはみ出さないよう、輪の範囲だけに重ねる
	context.save();
	context.beginPath();
	context.arc(GLOW_CENTER, GLOW_CENTER, GLOW_CENTER * 0.9, 0, Math.PI * 2);
	context.arc(GLOW_CENTER, GLOW_CENTER, GLOW_CENTER * 0.6, 0, Math.PI * 2, true);
	context.clip();
	const bright = context.createRadialGradient(
		GLOW_CENTER,
		GLOW_SIZE * 0.82,
		0,
		GLOW_CENTER,
		GLOW_SIZE * 0.82,
		GLOW_CENTER * 0.8,
	);
	bright.addColorStop(0, "rgba(255, 240, 190, 0.9)");
	bright.addColorStop(1, "rgba(255, 200, 120, 0)");
	context.globalCompositeOperation = "lighter";
	context.fillStyle = bright;
	context.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
	context.restore();
	return toTexture(canvas);
}

// テレポートの矢印の後ろの光。白でぼかして描き、色は材質の発光の色で付ける
function softGlowTexture(): CanvasTexture {
	const [canvas, context] = canvas2d(GLOW_SIZE);
	const glow = context.createRadialGradient(
		GLOW_CENTER,
		GLOW_CENTER,
		0,
		GLOW_CENTER,
		GLOW_CENTER,
		GLOW_CENTER,
	);
	glow.addColorStop(0, "rgba(255, 255, 255, 0.85)");
	glow.addColorStop(0.4, "rgba(255, 255, 255, 0.35)");
	glow.addColorStop(1, "rgba(255, 255, 255, 0)");
	context.fillStyle = glow;
	context.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
	return toTexture(canvas);
}

// 材質

export type PartMaterials = {
	tile: MeshStandardMaterial;
	wall: MeshStandardMaterial;
	hole: MeshStandardMaterial;
	holeGlow: MeshStandardMaterial;
	start: MeshStandardMaterial;
	flagPole: MeshStandardMaterial;
	flag: MeshStandardMaterial;
	teleportUp: MeshStandardMaterial;
	teleportUpGlow: MeshStandardMaterial;
	teleportDown: MeshStandardMaterial;
	teleportDownGlow: MeshStandardMaterial;
	key: MeshStandardMaterial;
};

const TILE_TEXTURE = tileTexture();
const WALL_TEXTURE = wallTexture();
const HOLE_GLOW_TEXTURE = holeGlowTexture();
const SOFT_GLOW_TEXTURE = softGlowTexture();

/*
 * 光の板の材質。色は付けず（黒）、模様の色と明るさをそのまま発光にする
 * 明るさを抑える変換（トーンマッピング）をかけず、奥の物を隠さないように深さを書き込まない
 */
function glowMaterial(
	texture: CanvasTexture,
	emissive: string,
	opacity: number,
	intensity: number,
): MeshStandardMaterial {
	return new MeshStandardMaterial({
		color: "#000000",
		map: texture,
		emissive,
		emissiveMap: texture,
		emissiveIntensity: intensity,
		transparent: true,
		opacity,
		depthWrite: false,
		toneMapped: false,
		side: DoubleSide,
	});
}

function createMaterials(opacity: number): PartMaterials {
	// 透かす階も深さは書き込む（同じ階の壁の裏側の面まで透けて見えると、形が分かりにくい）
	const common = { transparent: opacity < 1, opacity };
	return {
		tile: new MeshStandardMaterial({ ...common, map: TILE_TEXTURE, roughness: 0.95 }),
		wall: new MeshStandardMaterial({ ...common, map: WALL_TEXTURE, roughness: 0.95 }),
		hole: new MeshStandardMaterial({ ...common, color: "#000000", roughness: 1 }),
		holeGlow: glowMaterial(HOLE_GLOW_TEXTURE, "#ffffff", opacity, 1.3),
		start: new MeshStandardMaterial({
			...common,
			color: "#1c7ed6",
			emissive: "#339af0",
			emissiveIntensity: 0.5,
		}),
		flagPole: new MeshStandardMaterial({ ...common, color: "#868e96", metalness: 0.4 }),
		flag: new MeshStandardMaterial({ ...common, color: "#2f9e44", roughness: 0.6 }),
		teleportUp: new MeshStandardMaterial({
			...common,
			color: "#e03131",
			emissive: "#ff3b3b",
			emissiveIntensity: 0.9,
			toneMapped: false,
		}),
		teleportUpGlow: glowMaterial(SOFT_GLOW_TEXTURE, "#ff4d4d", opacity, 1.2),
		teleportDown: new MeshStandardMaterial({
			...common,
			color: "#1971c2",
			emissive: "#339af0",
			emissiveIntensity: 0.9,
			toneMapped: false,
		}),
		teleportDownGlow: glowMaterial(SOFT_GLOW_TEXTURE, "#4dabf7", opacity, 1.2),
		key: new MeshStandardMaterial({ ...common, color: "#f2b705", metalness: 0.7, roughness: 0.3 }),
	};
}

// いちばん下の階と、その上に重ねて少し透かす階（下の階が透けて見える程度）
export const SOLID_MATERIALS = createMaterials(1);
export const SEE_THROUGH_MATERIALS = createMaterials(0.6);
