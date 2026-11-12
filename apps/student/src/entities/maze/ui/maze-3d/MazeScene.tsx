/*
 * 迷路の3D（仕様書README.mdの「迷路の3D（しょうさいとプレイで共通）」、backend.mdの「3D（React Three Fiber）」）
 * - 階は上に重ねて描き、上の階は少し透かして下の階が見えるようにする
 * - ロボットがスタートのマスに向きつきで立つ
 * - 3Dは静止していて、児童が指で迷路の中心を軸に回す（自動で回し続けない）
 * - 開いたときのカメラは斜め上から全階が見える角度。ズームは全体が収まる距離を上限、その3分の1を下限にする
 * - <Canvas>は一画面に一つ、frameloop="demand"、描画解像度の上限を決め、影と後処理は使わない
 */
import type { Maze } from "@kasane/core";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";

import { cameraRange, initialCameraPosition, mazeBounds } from "../../lib/camera";
import { cellPositionsByLayer } from "../../lib/layers";
import { LayerModel } from "./LayerModel";
import { SEE_THROUGH_MATERIALS, SOLID_MATERIALS } from "./parts";
import { Robot } from "./Robot";

import classes from "./MazeScene.module.css";

// カメラの縦の視野角（度）
const FOV = 40;

type Props = { maze: Maze };

export function MazeScene({ maze }: Props) {
	return (
		<div className={classes.stage}>
			<Canvas
				frameloop="demand"
				dpr={[1, 1.5]}
				camera={{ fov: FOV, near: 0.1, far: 500 }}
				aria-label="迷路の3D"
			>
				<MazeModel maze={maze} />
			</Canvas>
		</div>
	);
}

function MazeModel({ maze }: Props) {
	const size = maze.layers[0]?.length ?? 0;
	const layerCount = maze.layers.length;
	const layers = useMemo(() => cellPositionsByLayer(maze), [maze]);
	const start = layers.flatMap(({ byCell }) => byCell.start)[0];

	return (
		<>
			<ambientLight intensity={1.4} />
			<directionalLight position={[6, 12, 8]} intensity={1.6} />
			<CameraRig size={size} layerCount={layerCount} />

			{layers.map((positions, layer) => (
				<LayerModel
					// 階は並びが変わらないので、階の番号をkeyにする
					key={layer}
					size={size}
					layer={layer}
					positions={positions}
					startDirection={maze.startDirection}
					materials={layer === 0 ? SOLID_MATERIALS : SEE_THROUGH_MATERIALS}
				/>
			))}

			{/* ロボットのモデルを読み込む間も、迷路は先に見せる */}
			{start !== undefined && (
				<Suspense fallback={null}>
					<Robot size={size} position={start} direction={maze.startDirection} />
				</Suspense>
			)}
		</>
	);
}

type CameraRigProps = { size: number; layerCount: number };

// カメラを最初の位置に置き、迷路の中心を軸に指で回せるようにする
function CameraRig({ size, layerCount }: CameraRigProps) {
	const camera = useThree((state) => state.camera);
	const invalidate = useThree((state) => state.invalidate);
	const width = useThree((state) => state.size.width);
	const height = useThree((state) => state.size.height);
	const { center, radius } = useMemo(() => mazeBounds(size, layerCount), [size, layerCount]);
	const { minDistance, maxDistance } = cameraRange(radius, FOV, width / height);
	const placed = useRef(false);

	// 最初の一回だけ置く（画面の大きさが変わっても、児童が回した向きは戻さない）
	useLayoutEffect(() => {
		if (placed.current) return;
		placed.current = true;
		camera.position.set(...initialCameraPosition(center, maxDistance));
		// 描き直しは求めたときだけなので、置いた位置で描き直す
		invalidate();
	}, [camera, invalidate, center, maxDistance]);

	return (
		<OrbitControls
			makeDefault
			target={[...center]}
			enablePan={false}
			minDistance={minDistance}
			maxDistance={maxDistance}
			// 床の下からは見上げない
			maxPolarAngle={Math.PI / 2}
		/>
	);
}
