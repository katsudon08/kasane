/*
 * 穴をうめるときの光る球の見た目を確かめる（仕様書README.mdの「1ターンの動き」のfill）
 * 進み具合（progress）を決めて止めた姿を描く。loopにすると、1ターン（1秒）の動きをくり返す
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef } from "react";

import { OrbEffect } from "./maze-3d/OrbEffect";
import type { OrbHandle } from "./maze-3d/OrbEffect";
import { HOLE_GEOMETRY, HOLE_GLOW_GEOMETRY, SOLID_MATERIALS, TILE_GEOMETRY } from "./maze-3d/parts";

type Props = { progress: number; loop: boolean };

function Scene({ progress, loop }: Props) {
	const orb = useRef<OrbHandle>(null);
	const camera = useThree((state) => state.camera);
	const invalidate = useThree((state) => state.invalidate);
	const elapsed = useRef(0);

	useLayoutEffect(() => {
		camera.position.set(0, 1.4, 1.8);
		camera.lookAt(0, 0.3, 0);
		invalidate();
	}, [camera, invalidate, progress, loop]);

	useFrame((state, delta) => {
		elapsed.current = (elapsed.current + Math.min(delta, 0.1)) % 1;
		orb.current?.update([0, 0, 0], loop ? elapsed.current : progress);
		if (loop) state.invalidate();
	});

	return (
		<>
			<ambientLight intensity={1.4} />
			<directionalLight position={[6, 12, 8]} intensity={1.6} />
			<mesh geometry={TILE_GEOMETRY} material={SOLID_MATERIALS.tile} />
			<mesh geometry={HOLE_GEOMETRY} material={SOLID_MATERIALS.hole} />
			<mesh geometry={HOLE_GLOW_GEOMETRY} material={SOLID_MATERIALS.holeGlow} />
			<OrbEffect ref={orb} />
		</>
	);
}

function OrbPreview(props: Props) {
	return (
		<div style={{ width: 480, height: 360, background: "#495057" }}>
			<Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 40 }}>
				<Scene {...props} />
			</Canvas>
		</div>
	);
}

const meta = {
	title: "entities/maze/穴をうめる光る球",
	component: OrbPreview,
	args: { progress: 0.45, loop: false },
	argTypes: { progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } } },
} satisfies Meta<typeof OrbPreview>;

export default meta;

export const Growing: StoryObj<typeof meta> = {};
export const Sinking: StoryObj<typeof meta> = { args: { progress: 0.75 } };
export const Loop: StoryObj<typeof meta> = { args: { loop: true } };
