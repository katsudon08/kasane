/*
 * 入口の背景の場面（仕様書free-mode.mdの「背景の画像」）
 * 雲の海に浮かぶ雲の上に、主役のロボットが立ち、空に「KASANE」の文字を積み上げている
 * - ロボットは、アプリの3Dのロボット（前身ProgPathのモデル）を、立方体で組み直したピクセル調にする
 * - 文字は、3枚の層を少しずつずらして重ねる（KASANE＝重ね）
 * - いちばん手前の層は、まだ積み終えていない。Sの下半分のかぎの形が欠けていて、奥の層の水色が見える
 *   欠けた所へ、ロボットの頭の上から立方体が弧を描いて運ばれていく
 *   運ばれる立方体は、ロボットに近いほど転がっていて、欠けた所に近づくほど向きがそろう
 * - 迷路のマスや命令カードは描かない（あとで作り替えても、この絵を描き直さずに済むように）
 * - 形と色だけで見せる。ぼかし・四隅を暗くする処理・光の粒・逆光の光の玉は使わない（AIで作った絵のように見えるため）
 *   光は左手前の上から当て、上の面を明るく、横の面を少し暗くして、立方体の形を読ませる
 *   光がにじむのは、ロボットの目だけにする
 * - 色の基調は青と白。昼の明るい空にする
 * - 16:9で書き出し、4:3に切り取られても文字とロボットが切れないよう、横幅の真ん中の4分の3に収める
 * - 文字は画面の上のほうに置き、ボタンを置く下のほう（雲の海）と、ダウンロードのボタンを置く右上（空）には物を少なくする
 * 書き出しはrender.tsが行う
 */
import {
	BoxGeometry,
	CanvasTexture,
	Color,
	DirectionalLight,
	Fog,
	Group,
	HemisphereLight,
	InstancedMesh,
	type Material,
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	Object3D,
	PCFShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	SRGBColorSpace,
	Scene,
	Vector2,
	Vector3,
	WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

declare global {
	interface Window {
		// render.tsが、描き終えたことを知るため
		startBackgroundRendered?: boolean;
	}
}

const WHITE = "#ffffff";
const BLUE = "#1c7ed6";
const DEEP_BLUE = "#1452a8";
const SKY_BLUE = "#74c0fc";
// 地平線の色。遠くの雲はこの色に溶ける
const HORIZON = "#d6eafb";
/*
 * 光をにじませる明るさの境目。ロボットの目だけを、この明るさより明るい色にする
 * 白い面（文字・雲・ロボットの体）は、いちばん明るい所でもこれより暗い
 */
const GLOW_THRESHOLD = 1.2;

// 5×7のピクセルの字（#が立方体）
const FONT: Readonly<Record<string, readonly string[]>> = {
	K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
	A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
	S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
	N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
	E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
};

// 毎回同じ絵になるよう、決まった種から乱数を作る（mulberry32）
function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (context === null) throw new Error("canvasの2Dが使えない");
	return [canvas, context];
}

function texture(canvas: HTMLCanvasElement): CanvasTexture {
	const result = new CanvasTexture(canvas);
	result.colorSpace = SRGBColorSpace;
	result.anisotropy = 8;
	return result;
}

/*
 * 昼の空。画面の上から下へ、青から地平線の白っぽい水色へ移る
 * 背景の絵は画面いっぱいに引き伸ばされるので、地平線の高さ（カメラの向きで決まる）に合わせて色を置く
 */
function skyTexture(): CanvasTexture {
	const [canvas, context] = canvas2d(4, 1024);
	const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
	gradient.addColorStop(0, "#3d8be0");
	gradient.addColorStop(0.45, "#86bdf0");
	gradient.addColorStop(0.62, HORIZON);
	gradient.addColorStop(1, "#eef6fd");
	context.fillStyle = gradient;
	context.fillRect(0, 0, canvas.width, canvas.height);
	return texture(canvas);
}

function shadowed<T extends Object3D>(object: T): T {
	object.traverse((child) => {
		if (child instanceof Mesh) {
			child.castShadow = true;
			child.receiveShadow = true;
		}
	});
	return object;
}

const TITLE = "KASANE";
// 文字の1マスの大きさと、文字の真ん中の位置
const PIXEL = 0.42;
const TITLE_POSITION = new Vector3(0.4, 8.1, -16);
/*
 * いちばん手前の層で、まだ積んでいないマス（列, 行）。2文字目のSの下半分のかぎの形（右の縦と下の段）
 * 1マスだけだと、欠けているのか分かりにくいので、まとまった形で欠けさせる
 * 先頭のマスへ、いま運んでいる
 */
const MISSING_CELLS: readonly (readonly [number, number])[] = [
	[12, 6],
	[13, 6],
	[14, 6],
	[15, 6],
	[16, 5],
	[16, 4],
];

// 文字の1マスの、文字の真ん中から見た位置（列は字の間の1列を含めて数える。行は上から）
function cellOffset(column: number, row: number): Vector3 {
	const columns = TITLE.length * 6 - 1;
	return new Vector3((column - (columns - 1) / 2) * PIXEL, (3 - row) * PIXEL, 0);
}

// 文字の立方体の形と色。前の面の色と、横の面の色を分けて、立方体の並びに見せる
function letterCube(front: Material, side: Material): [BoxGeometry, Material[]] {
	// BoxGeometryの面の順は、右・左・上・下・前・後ろ
	return [
		new BoxGeometry(PIXEL * 0.94, PIXEL * 0.94, PIXEL * 0.9),
		[side, side, side, side, front, side],
	];
}

// 「KASANE」の1枚の層。字は立てて、カメラのほうを向ける。missingのマスは置かない
function letterLayer(
	front: Material,
	side: Material,
	missing: readonly (readonly [number, number])[],
): InstancedMesh {
	const cells: [number, number][] = [];
	TITLE.split("").forEach((letter, index) => {
		const rows = FONT[letter];
		if (rows === undefined) throw new Error(`${letter}の字がない`);
		rows.forEach((row, y) => {
			row.split("").forEach((mark, x) => {
				const column = index * 6 + x;
				const skipped = missing.some(([c, r]) => c === column && r === y);
				if (mark === "#" && !skipped) cells.push([column, y]);
			});
		});
	});
	const mesh = new InstancedMesh(...letterCube(front, side), cells.length);
	const dummy = new Object3D();
	cells.forEach(([column, row], index) => {
		dummy.position.copy(cellOffset(column, row));
		dummy.updateMatrix();
		mesh.setMatrixAt(index, dummy.matrix);
	});
	return mesh;
}

// 3枚の層を、少しずつ右下・奥へずらして重ねる（KASANE＝重ね）。手前の層が奥の層に影を落とす
const TITLE_LAYERS: readonly [string, string][] = [
	[WHITE, SKY_BLUE],
	[SKY_BLUE, BLUE],
	[BLUE, DEEP_BLUE],
];

function layeredTitle(): Group {
	const title = new Group();
	TITLE_LAYERS.forEach(([front, side], index) => {
		const layer = letterLayer(
			new MeshLambertMaterial({ color: front }),
			new MeshLambertMaterial({ color: side }),
			index === 0 ? MISSING_CELLS : [],
		);
		layer.position.set(index * PIXEL * 0.34, -index * PIXEL * 0.34, -index * PIXEL * 1.1);
		title.add(shadowed(layer));
	});
	return title;
}

/*
 * ロボットの頭の上から、いちばん手前の層の欠けた所へ運ばれていく立方体
 * - 画面の上で文字の下を通り、欠けた所へ下から入る道筋に並べる（文字に重なると読みにくい）
 *   道筋は画面の上の曲線（2次ベジエ）で決め、奥行きはロボットから文字へ少しずつ遠くする
 * - ロボットに近いほど大きく転がり、欠けた所に近づくほど向きがそろう
 * - 欠けた所は空けたままにする（はまりかけの立方体を置くと、欠けが分かりにくい）
 */
function flyingCubes(camera: PerspectiveCamera, from: Vector3): Group {
	const [frontColor, sideColor] = TITLE_LAYERS[0] ?? [WHITE, SKY_BLUE];
	const [geometry, materials] = letterCube(
		new MeshLambertMaterial({ color: frontColor }),
		new MeshLambertMaterial({ color: sideColor }),
	);
	const cubes = new Group();
	const place = (position: Vector3, tumble: number) => {
		const cube = new Mesh(geometry, materials);
		cube.position.copy(position);
		cube.rotation.set(0.9 * tumble, 0.7 * tumble, 0.5 * tumble);
		cubes.add(cube);
	};
	// 画面の上の位置（-1〜1）
	const toScreen = (point: Vector3): Vector2 => {
		const projected = point.clone().project(camera);
		return new Vector2(projected.x, projected.y);
	};
	// 画面の上の位置に見えて、奥行きがzの所
	const atScreen = (screen: Vector2, z: number): Vector3 => {
		const direction = new Vector3(screen.x, screen.y, 0.5)
			.unproject(camera)
			.sub(camera.position)
			.normalize();
		return camera.position
			.clone()
			.addScaledVector(direction, (z - camera.position.z) / direction.z);
	};

	const [column, row] = MISSING_CELLS[0] ?? [0, 0];
	const target = cellOffset(column, row).add(TITLE_POSITION);
	const start = toScreen(from);
	const end = toScreen(target);
	// 曲線を引っ張る点。始めと終わりの真ん中の、低いほうより下（文字の下を通る）
	const control = new Vector2((start.x + end.x) / 2, Math.min(start.y, end.y) - 0.12);
	const count = 5;
	for (let i = 0; i < count; i++) {
		const t = i / count;
		const screen = new Vector2()
			.addScaledVector(start, (1 - t) ** 2)
			.addScaledVector(control, 2 * (1 - t) * t)
			.addScaledVector(end, t ** 2);
		place(atScreen(screen, from.z + (target.z + 1 - from.z) * t), 1 - t);
	}
	return shadowed(cubes);
}

function box(width: number, height: number, depth: number, material: Material): Mesh {
	return new Mesh(new BoxGeometry(width, height, depth), material);
}

/*
 * ピクセル調のロボット。アプリの3Dのロボット（robot.glb）と同じ作りを、立方体で組み直す
 * - 白い横長の胴の両側に、横から見て三角の黒いキャタピラ。胴の前の右に、黄と青の小さな明かり
 * - 黒い首の上に、白い四角の頭。前の面に2段にへこんだ穴があり、奥に黒い画面と、縦長の水色の光る目が二つ（口はない）
 * - 頭の上に、黒いV字のアンテナ。腕はない
 * 寸法は1ピクセル（u）の倍数にする。原点は足もと、正面は+z。頭は首を軸に、少し上を見上げる
 */
function voxelRobot(u: number): Group {
	// つやは付けない。目と明かりは光を受けない色（自分で光っている物）にし、目だけは光がにじむほど明るくする
	const white = new MeshLambertMaterial({ color: "#fafafa" });
	const black = new MeshLambertMaterial({ color: "#1b1b1b" });
	const wheel = new MeshLambertMaterial({ color: "#4a4f57" });
	const screen = new MeshLambertMaterial({ color: "#050505" });
	const eye = new MeshBasicMaterial({
		color: new Color("#7fe9ff").multiplyScalar(GLOW_THRESHOLD * 1.8),
	});

	const robot = new Group();
	const head = new Group();
	head.position.y = 14 * u;
	head.rotation.set(-0.16, 0.28, 0);
	robot.add(head);
	const add = (parent: Group, mesh: Mesh, x: number, y: number, z: number) => {
		mesh.position.set(x * u, y * u, z * u);
		parent.add(mesh);
	};

	// キャタピラ。下ほど前後に長い段を積んで、横から見て三角にする。外側に車輪の丸（四角）を3つ
	const treadRows = [18, 17, 15, 13, 10, 7, 4];
	for (const side of [-1, 1]) {
		treadRows.forEach((length, row) => {
			add(robot, box(4 * u, 2 * u, length * u, black), side * 13, 1 + row * 2, 0);
		});
		const wheels: [number, number][] = [
			[2.5, -5.5],
			[2.5, 5.5],
			[9.5, 0],
		];
		for (const [y, z] of wheels) {
			add(robot, box(0.4 * u, 3 * u, 3 * u, wheel), side * 15.1, y, z);
		}
	}
	// 胴と、前の右の黄と青の明かり
	add(robot, box(22 * u, 11 * u, 14 * u, white), 0, 7.5, 0);
	const lamps: [string, number][] = [
		["#f2e64d", 4.8],
		["#5aa8ff", 7.4],
	];
	for (const [color, x] of lamps) {
		add(robot, box(1.6 * u, 1.6 * u, 0.4 * u, new MeshBasicMaterial({ color })), x, 8, 7.1);
	}
	// 首と頭（ここからは首の上を原点にする）
	add(robot, box(6 * u, 1 * u, 6 * u, black), 0, 13.5, 0);
	/*
	 * 頭は幅20・高さ13・奥行き16。前の面（z=8）に、画面の穴を2段にへこませて開ける
	 * 外の段は幅14・高さ10を0.6の深さ、内の段は幅12・高さ8をさらに0.6の深さ。いちばん奥に黒い画面を貼る
	 * 穴の真ん中の高さは5.5
	 */
	add(head, box(20 * u, 13 * u, 14.8 * u, white), 0, 6.5, -0.6);
	// 穴の周りの枠（厚さ0.6）。穴の高さの真ん中は5.5、枠の外は幅outerWidth・高さouterBottom〜outerTop
	const frame = (
		holeWidth: number,
		holeHeight: number,
		outerWidth: number,
		outerBottom: number,
		outerTop: number,
		z: number,
	) => {
		const holeTop = 5.5 + holeHeight / 2;
		const holeBottom = 5.5 - holeHeight / 2;
		const side = (outerWidth - holeWidth) / 2;
		const bars: [number, number, number, number][] = [
			[outerWidth, outerTop - holeTop, 0, (outerTop + holeTop) / 2],
			[outerWidth, holeBottom - outerBottom, 0, (holeBottom + outerBottom) / 2],
			[side, holeHeight, -(holeWidth + side) / 2, 5.5],
			[side, holeHeight, (holeWidth + side) / 2, 5.5],
		];
		for (const [width, height, x, y] of bars) {
			add(head, box(width * u, height * u, 0.6 * u, white), x, y, z);
		}
	};
	// 外の段は頭の前の面いっぱい、内の段は外の段の穴の中
	frame(14, 10, 20, 0, 13, 7.7);
	frame(12, 8, 14, 0.5, 10.5, 7.1);
	add(head, box(12 * u, 8 * u, 0.1 * u, screen), 0, 5.5, 6.85);
	for (const side of [-1, 1]) add(head, box(2 * u, 5 * u, 0.1 * u, eye), side * 2.75, 5.3, 6.95);
	// V字のアンテナ。根もとから左右へ、斜めに3つずつ立方体を積む（小さいと見えないので、少し大きくする）
	add(head, box(1.1 * u, 1.1 * u, 1.1 * u, black), 0, 13.5, 0);
	for (const side of [-1, 1]) {
		for (let step = 1; step <= 3; step++) {
			add(head, box(1.1 * u, 1.1 * u, 1.1 * u, black), side * step, 13.5 + step * 1.1, 0);
		}
	}
	return shadowed(robot);
}

type CloudBox = { x: number; y: number; z: number; w: number; h: number; d: number };

// 雲の立方体の並び
function cloudMesh(boxes: readonly CloudBox[]): InstancedMesh {
	const mesh = new InstancedMesh(
		new BoxGeometry(1, 1, 1),
		new MeshLambertMaterial({ color: WHITE }),
		boxes.length,
	);
	const dummy = new Object3D();
	boxes.forEach(({ x, y, z, w, h, d }, index) => {
		dummy.position.set(x, y, z);
		dummy.scale.set(w, h, d);
		dummy.updateMatrix();
		mesh.setMatrixAt(index, dummy.matrix);
	});
	return mesh;
}

/*
 * 雲の海。ピクセル調に合わせ、雲も立方体を積んで作る
 * 平たい板の上に、小さな塊をいくつか載せて、ふくらんだ形にする
 */
function voxelClouds(): InstancedMesh {
	const random = seededRandom(7);
	const between = (min: number, max: number) => min + (max - min) * random();
	const boxes: CloudBox[] = [];
	// 平たい板の上に、小さな塊を1〜3つ載せる（積みすぎると街並みに見える）
	const tier = (
		x: number,
		y: number,
		z: number,
		w: number,
		h: number,
		d: number,
		level: number,
	): void => {
		boxes.push({ x, y, z, w, h, d });
		if (level >= 1) return;
		const count = 1 + Math.floor(random() * 3);
		for (let j = 0; j < count; j++) {
			const bw = w * between(0.3, 0.6);
			const bh = h * between(0.5, 1);
			const bd = d * between(0.4, 0.75);
			tier(
				x + between(-(w - bw) / 2, (w - bw) / 2),
				y + h / 2 + bh / 2,
				z + between(-(d - bd) / 2, (d - bd) / 2),
				bw,
				bh,
				bd,
				level + 1,
			);
		}
	};
	for (let i = 0; i < 150; i++) {
		const x = between(-90, 90);
		// カメラのすぐ前には置かない（大きな板が手前をふさぐ）
		const z = between(-130, -3);
		// 遠くの雲ほど大きくして、遠くまで続いて見えるようにする
		const scale = between(0.8, 1.5) * (1 + Math.max(0, -z - 20) / 40);
		tier(
			x,
			-3 + between(-0.4, 0.3),
			z,
			between(5, 12) * scale,
			between(0.4, 0.7) * scale,
			between(3, 7) * scale,
			0,
		);
	}
	return cloudMesh(boxes);
}

async function render(): Promise<void> {
	const width = window.innerWidth;
	const height = window.innerHeight;
	const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	// 2倍の細かさで描いて縮め、立方体の縁のぎざぎざをなくす
	renderer.setPixelRatio(2);
	renderer.setSize(width, height);
	renderer.outputColorSpace = SRGBColorSpace;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFShadowMap;
	document.body.append(renderer.domElement);

	const scene = new Scene();
	scene.background = skyTexture();
	// 遠くの雲は、地平線の色に溶ける（雲の海の果てを見せない）
	scene.fog = new Fog(new Color(HORIZON), 40, 170);

	// ロボットの足もとより少し高い所から、少し見上げる（主役を大きく見せる）
	const camera = new PerspectiveCamera(36, width / height, 0.1, 400);
	camera.position.set(0.4, 1.7, 11);
	camera.lookAt(0.4, 3.0, -14);

	/*
	 * 空からの光と、左手前の上からの光
	 * 上の面がいちばん明るく、前の面、横の面の順に暗くなる。影は空の色で青みを帯びる
	 */
	scene.add(new HemisphereLight("#ffffff", "#c7d3e3", 1.65));
	const key = new DirectionalLight("#ffffff", 1.9);
	key.position.set(-8, 14, 10);
	key.castShadow = true;
	key.shadow.mapSize.set(4096, 4096);
	key.shadow.camera.left = -25;
	key.shadow.camera.right = 25;
	key.shadow.camera.top = 25;
	key.shadow.camera.bottom = -25;
	key.shadow.camera.near = 1;
	key.shadow.camera.far = 70;
	key.shadow.bias = -0.0005;
	key.shadow.radius = 2;
	scene.add(key);

	/*
	 * 雲の海と、雲の間からのぞく、ずっと下の雲の層（高い所にいると分かる）
	 * 雲の海には影を落とさない（空の文字の影が、雲の上に字の形で映ってしまう）
	 */
	scene.add(voxelClouds());
	const cloudFloor = new Mesh(
		new PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
		new MeshLambertMaterial({ color: "#c4dbf3" }),
	);
	cloudFloor.position.y = -7;
	scene.add(cloudFloor);

	// 空に浮かぶ、重ねた「KASANE」
	const title = layeredTitle();
	title.position.copy(TITLE_POSITION);
	scene.add(title);

	/*
	 * 主役のロボットが立つ雲。上の段ほど短くして、横から見て角の段になったピクセルの雲の形にする
	 * 上の面は平らにして、ロボットを載せる。ロボットの影はこの雲にだけ落とす
	 * 4:3に切り取られてもロボットが切れないよう、横幅の真ん中の4分の3に収める
	 */
	const stage = cloudMesh([
		{ x: -2.6, y: -0.15, z: 0.2, w: 2.6, h: 0.3, d: 1.6 },
		{ x: -2.6, y: 0.18, z: 0.2, w: 3.8, h: 0.36, d: 2.1 },
		{ x: -2.6, y: 0.58, z: 0.2, w: 3, h: 0.44, d: 1.9 },
	]);
	stage.receiveShadow = true;
	scene.add(stage);
	// カメラのほうを向いて、顔だけ文字のほうを見上げる
	const robot = voxelRobot(0.075);
	robot.position.set(-2.6, 0.8, 0.2);
	robot.rotation.y = 0.18;
	scene.add(robot);
	// ロボットの頭（アンテナ）の少し上から、文字の欠けた所へ
	camera.updateMatrixWorld();
	scene.add(flyingCubes(camera, new Vector3(-2.3, 3.2, -0.6)));

	// 宙に浮かぶ小さな雲（奥行きを出す。右上の空は空けておく）
	scene.add(
		cloudMesh([
			{ x: 7.6, y: 3.6, z: -16, w: 3.2, h: 0.5, d: 1.8 },
			{ x: 7.9, y: 4, z: -16, w: 1.4, h: 0.4, d: 1 },
			{ x: 3.4, y: 1.4, z: -6, w: 1.6, h: 0.35, d: 1 },
			{ x: -9.6, y: 2.6, z: -20, w: 3.6, h: 0.6, d: 2 },
			{ x: -9.2, y: 3.05, z: -20, w: 1.6, h: 0.4, d: 1.2 },
		]),
	);

	// ロボットの目だけ、光を少しにじませる（境目より明るい所だけに掛かる）
	const composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	composer.addPass(new UnrealBloomPass(new Vector2(width, height), 0.45, 0.1, GLOW_THRESHOLD));
	composer.addPass(new OutputPass());

	composer.render();
	await new Promise((resolve) => requestAnimationFrame(resolve));
	composer.render();
	window.startBackgroundRendered = true;
}

void render();
