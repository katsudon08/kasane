/*
 * プレイ画面の迷路の3D（仕様書README.mdの「プレイ」「ロボットを動かす」、backend.mdの「3D（React Three Fiber）」）
 * - カメラ映像の上に重ねるので、背景は透明にする。見た目はしょうさい画面の3Dと同じで、指で回せる
 * - 回す中心は、ロボットが今いる階に置き続ける。ロボットがいない階は透明に近づける
 * - ロボットの動きは、stepsをuseFrameの中で補間してrefを書き換える（1フレームごとにReactのstateを更新しない）
 * - frameloop="demand"。ロボットが動いている間と、指で回している間だけ描き直す
 */
import type { Maze, Outcome, Step } from "@kasane/core";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef } from "react";
import type { Group } from "three";

import { CAMERA_FOV, cameraRange, initialCameraPosition, mazeBounds } from "../../lib/camera";
import { cellPositionsByLayer } from "../../lib/layers";
import { frameAt, preparingFrame, restFrame, stepMotion } from "../../lib/robot-motion";
import type { Frame } from "../../lib/robot-motion";
import { boardAt, robotAt } from "../../lib/run-playback";
import { LAYER_GAP, WALL_HEIGHT, cellCenter } from "../../lib/scene-layout";
import { KEY_ROTATION, KeyModel, LayerModel } from "./LayerModel";
import { OrbEffect } from "./OrbEffect";
import type { OrbHandle } from "./OrbEffect";
import { FADED_MATERIALS, KEY_HEIGHT, SOLID_MATERIALS } from "./parts";
import { RobotModel } from "./Robot";

import classes from "./MazeScene.module.css";

// 動かしているstepと、そこまでの結果
export type PlayAnimation = {
	steps: readonly Step[];
	outcome: Outcome;
	// 終わったターンの数
	turn: number;
	// turn個目のstepを動かしているか（止まっている間はturnの状態のまま）
	animating: boolean;
};

export type PlaySceneProps = {
	maze: Maze;
	// 「つくる」の間はnull（スタートに立つ）
	animation: PlayAnimation | null;
	// 送って結果を待つ間（ロボットが準備する短い動き）
	preparing: boolean;
	// turn個目のstepの動きが終わった
	onTurnEnd: (turn: number) => void;
};

const NO_STEPS: readonly Step[] = [];

// boardAtで床に変わるマスの数（うめた穴と取った鍵）
function changedCells(steps: readonly Step[], turn: number, animating: boolean): number {
	return steps.filter(
		(step, index) =>
			(index < turn && step.filled !== undefined) ||
			(step.tookKey === true && (animating ? index <= turn : index < turn)),
	).length;
}

export function PlayScene({ maze, animation, preparing, onTurnEnd }: PlaySceneProps) {
	return (
		<div className={classes.overlay}>
			<Canvas
				frameloop="demand"
				dpr={[1, 1.5]}
				camera={{ fov: CAMERA_FOV, near: 0.1, far: 500 }}
				aria-label="迷路の3D"
			>
				<PlayModel maze={maze} animation={animation} preparing={preparing} onTurnEnd={onTurnEnd} />
			</Canvas>
		</div>
	);
}

function PlayModel({ maze, animation, preparing, onTurnEnd }: PlaySceneProps) {
	const size = maze.layers[0]?.length ?? 0;
	const steps = animation?.steps ?? NO_STEPS;
	const turn = animation?.turn ?? 0;
	const animating = animation?.animating ?? false;
	/*
	 * 迷路が変わるのは、穴をうめたターンと鍵を取ったターンだけ。変わったマスの数で覚え、それ以外のターンでは作り直さない
	 * （作り直すと全部の階のマスを置き直すため）。変わるマスはstepsの順に増えるので、数が同じなら同じ迷路になる
	 */
	const changes = changedCells(steps, turn, animating);
	const board = useMemo(
		() => boardAt(maze, steps, turn, animating),
		// turnとanimatingは、changesが同じなら同じ迷路になるので、作り直す理由に入れない
		[maze, steps, changes],
	);
	const layers = useMemo(() => cellPositionsByLayer(board), [board]);
	// ロボットがいる階。テレポートで現れる瞬間に、動きの側から知らせる
	const [focusLayer, setFocusLayer] = useState(() => robotAt(maze, steps, turn).layer);

	return (
		<>
			<ambientLight intensity={1.4} />
			<directionalLight position={[6, 12, 8]} intensity={1.6} />
			<PlayCameraRig size={size} layerCount={maze.layers.length} focusLayer={focusLayer} />

			{layers.map((positions, layer) => (
				<LayerModel
					// 階は並びが変わらないので、階の番号をkeyにする
					key={layer}
					size={size}
					layer={layer}
					positions={positions}
					startDirection={maze.startDirection}
					materials={layer === focusLayer ? SOLID_MATERIALS : FADED_MATERIALS}
				/>
			))}

			<RunActors
				size={size}
				maze={maze}
				steps={steps}
				turn={turn}
				animating={animating}
				celebrate={animating && animation?.outcome === "goal" && turn === steps.length - 1}
				preparing={preparing}
				onTurnEnd={onTurnEnd}
				onLayer={setFocusLayer}
			/>
		</>
	);
}

// 前のフレームから時間がたちすぎていても（描き直しを止めていた・タブを隠していた）、一度に進めすぎない
const MAX_DELTA = 0.1;

type RunActorsProps = {
	size: number;
	maze: Maze;
	steps: readonly Step[];
	turn: number;
	animating: boolean;
	celebrate: boolean;
	preparing: boolean;
	onTurnEnd: (turn: number) => void;
	onLayer: (layer: number) => void;
};

// ロボットと、鍵が上がって消える動き・穴をうめる光る球
function RunActors({
	size,
	maze,
	steps,
	turn,
	animating,
	celebrate,
	preparing,
	onTurnEnd,
	onLayer,
}: RunActorsProps) {
	const robotRef = useRef<Group>(null);
	const keyRef = useRef<Group>(null);
	const orbRef = useRef<OrbHandle>(null);
	const invalidate = useThree((state) => state.invalidate);
	const from = useMemo(() => robotAt(maze, steps, turn), [maze, steps, turn]);
	const step = animating ? steps[turn] : undefined;
	const motion = useMemo(
		() => (step === undefined ? null : stepMotion(step, celebrate)),
		[step, celebrate],
	);

	// 動かすstepが変わったら、時間を0から数え直す
	const clock = useRef({ elapsed: 0, fresh: true, ended: false });
	useLayoutEffect(() => {
		clock.current = { elapsed: 0, fresh: true, ended: false };
		invalidate();
	}, [from, motion, preparing, invalidate]);

	// useFrameの中から呼ぶので、最新の関数をrefで持つ
	const callbacks = useRef({ onTurnEnd, onLayer });
	useLayoutEffect(() => {
		callbacks.current = { onTurnEnd, onLayer };
	}, [onTurnEnd, onLayer]);
	const lastLayer = useRef<number | null>(null);

	const apply = useCallback(
		(frame: Frame) => {
			const robot = robotRef.current;
			if (robot !== null) {
				const [x, y, z] = cellCenter(size, frame.robot);
				robot.position.set(x, y + frame.robot.lift, z);
				robot.rotation.y = frame.robot.angle;
				robot.scale.setScalar(frame.robot.scale);
				robot.visible = frame.robot.scale > 0;
			}
			const key = keyRef.current;
			if (key !== null) {
				key.visible = frame.key !== null && frame.key.scale > 0;
				if (frame.key !== null) {
					const [x, y, z] = cellCenter(size, frame.key);
					key.position.set(x, y + KEY_HEIGHT + frame.key.lift, z);
					key.rotation.set(KEY_ROTATION[0], KEY_ROTATION[1] + frame.key.angle, KEY_ROTATION[2]);
					key.scale.setScalar(Math.max(frame.key.scale, 0));
				}
			}
			// orbのscaleは、うめる区切りの進み具合（0〜1）
			orbRef.current?.update(
				frame.orb === null ? null : cellCenter(size, frame.orb),
				frame.orb?.scale ?? 0,
			);
		},
		[size],
	);

	useFrame((state, delta) => {
		const time = clock.current;
		if (time.fresh) time.fresh = false;
		else time.elapsed += Math.min(delta, MAX_DELTA);

		let frame: Frame;
		if (step !== undefined && motion !== null) frame = frameAt(from, step, motion, time.elapsed);
		else if (preparing) frame = preparingFrame(from, time.elapsed);
		else frame = restFrame(from);
		apply(frame);

		if (frame.robot.layer !== lastLayer.current) {
			lastLayer.current = frame.robot.layer;
			callbacks.current.onLayer(frame.robot.layer);
		}

		if (motion !== null) {
			if (time.elapsed < motion.duration) state.invalidate();
			else if (!time.ended) {
				time.ended = true;
				callbacks.current.onTurnEnd(turn);
			}
		} else if (preparing) {
			state.invalidate();
		}
	});

	return (
		<>
			<group ref={robotRef}>
				{/* モデルを読み込む間も、時間は進めて動きを止めない */}
				<Suspense fallback={null}>
					<RobotModel />
				</Suspense>
			</group>
			<group ref={keyRef} visible={false}>
				<KeyModel material={SOLID_MATERIALS.key} />
			</group>
			<OrbEffect ref={orbRef} />
		</>
	);
}

type PlayCameraRigProps = { size: number; layerCount: number; focusLayer: number };

// 回す中心の高さ。その階の床と壁の上の中ほど
function focusHeight(layer: number): number {
	return layer * LAYER_GAP + WALL_HEIGHT / 2;
}

// 中心を移すときの速さ（1秒あたりに残りの距離を詰める割合）
const FOLLOW_RATE = 6;

/*
 * カメラを最初の位置に置き、ロボットがいる階の中心を軸に指で回せるようにする
 * ロボットが階を移ったら、児童が回した向きと距離はそのままに、中心とカメラを一緒に上下へ動かす
 */
function PlayCameraRig({ size, layerCount, focusLayer }: PlayCameraRigProps) {
	const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
	const camera = useThree((state) => state.camera);
	const invalidate = useThree((state) => state.invalidate);
	const width = useThree((state) => state.size.width);
	const height = useThree((state) => state.size.height);
	const { radius } = useMemo(() => mazeBounds(size, layerCount), [size, layerCount]);
	const { minDistance, maxDistance } = cameraRange(radius, CAMERA_FOV, width / height);
	const targetY = focusHeight(focusLayer);
	const currentY = useRef<number | null>(null);

	// 最初の一回だけ置く（画面の大きさが変わっても、児童が回した向きは戻さない）
	useLayoutEffect(() => {
		const orbit = controls.current;
		if (orbit === null || currentY.current !== null) return;
		currentY.current = targetY;
		orbit.target.set(0, targetY, 0);
		camera.position.set(...initialCameraPosition([0, targetY, 0], maxDistance));
		orbit.update();
		invalidate();
	}, [camera, invalidate, targetY, maxDistance]);

	// 中心の階が変わったら、描き直しを始める
	useLayoutEffect(() => {
		invalidate();
	}, [targetY, invalidate]);

	useFrame((state, delta) => {
		const orbit = controls.current;
		const current = currentY.current;
		if (orbit === null || current === null || current === targetY) return;
		const remaining = targetY - current;
		const move =
			Math.abs(remaining) < 0.01
				? remaining
				: remaining * Math.min(1, Math.min(delta, MAX_DELTA) * FOLLOW_RATE);
		currentY.current = current + move;
		orbit.target.y += move;
		camera.position.y += move;
		orbit.update();
		state.invalidate();
	});

	return (
		<OrbitControls
			ref={controls}
			makeDefault
			enablePan={false}
			minDistance={minDistance}
			maxDistance={maxDistance}
			// 床の下からは見上げない
			maxPolarAngle={Math.PI / 2}
		/>
	);
}
