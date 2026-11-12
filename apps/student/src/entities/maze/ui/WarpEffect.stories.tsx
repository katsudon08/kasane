/*
 * テレポートの光の柱の見た目を確かめる（仕様書README.mdの「1ターンの動き」のteleported）
 * 1階のテレポートのマスと2階の同じ行・列のマスをつなぐ。段階（stage）と進み具合（progress）を決めて止めた姿を描く
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef } from "react";

import { LAYER_GAP } from "../lib/scene-layout";
import type { WarpStage } from "../lib/warp";
import { SOLID_MATERIALS, TILE_GEOMETRY } from "./maze-3d/parts";
import { WarpEffect } from "./maze-3d/WarpEffect";
import type { WarpHandle } from "./maze-3d/WarpEffect";

type Props = { stage: WarpStage; progress: number; up: boolean };

function Scene({ stage, progress, up }: Props) {
	const warp = useRef<WarpHandle>(null);
	const camera = useThree((state) => state.camera);
	const invalidate = useThree((state) => state.invalidate);

	useLayoutEffect(() => {
		camera.position.set(0, LAYER_GAP / 2 + 1.5, 6);
		camera.lookAt(0, LAYER_GAP / 2, 0);
		invalidate();
	}, [camera, invalidate, stage, progress, up]);

	useFrame(() => {
		const lower = [0, 0, 0] as const;
		const upper = [0, LAYER_GAP, 0] as const;
		warp.current?.update({
			from: up ? lower : upper,
			to: up ? upper : lower,
			up,
			stage,
			progress,
		});
	});

	return (
		<>
			<ambientLight intensity={1.4} />
			<directionalLight position={[6, 12, 8]} intensity={1.6} />
			<mesh geometry={TILE_GEOMETRY} material={SOLID_MATERIALS.tile} />
			<mesh geometry={TILE_GEOMETRY} material={SOLID_MATERIALS.tile} position={[0, LAYER_GAP, 0]} />
			<WarpEffect ref={warp} />
		</>
	);
}

function WarpPreview(props: Props) {
	return (
		<div style={{ width: 360, height: 420, background: "#495057" }}>
			<Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 40 }}>
				<Scene {...props} />
			</Canvas>
		</div>
	);
}

const meta = {
	title: "entities/maze/テレポートの光の柱",
	component: WarpPreview,
	args: { stage: "vanish", progress: 0.6, up: true },
	argTypes: {
		stage: { control: "radio", options: ["vanish", "appear"] },
		progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
	},
} satisfies Meta<typeof WarpPreview>;

export default meta;

export const Up: StoryObj<typeof meta> = {};
export const Down: StoryObj<typeof meta> = { args: { up: false } };
