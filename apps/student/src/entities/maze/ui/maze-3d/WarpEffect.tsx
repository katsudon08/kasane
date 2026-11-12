/*
 * テレポートの光の柱（仕様書README.mdの「1ターンの動き」のteleported）
 * 元の階のテレポートのマスと、移る先の階の同じ行・列のマスを、光の柱でつなぐ
 * - 消える間: 柱が濃くなり、元の床に光の輪が広がる
 * - 現れる間: 先の床に光の輪が広がり、柱が薄くなって消える
 * - その間ずっと、光の粒がらせんを描いて元の階から先の階へ進み、輪が柱にそって移る
 * 上へは赤、下へは青。値はwarpLookで求め、useFrameから呼ばれるupdateでrefに書き込む
 */
import { useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import { Matrix4, Quaternion, Vector3 } from "three";
import type { Group, InstancedMesh, Mesh } from "three";

import type { Vec3 } from "../../lib/scene-layout";
import { warpLook } from "../../lib/warp";
import type { WarpStage } from "../../lib/warp";
import {
	BEAM_CORE_GEOMETRY,
	BEAM_GEOMETRY,
	BURST_GEOMETRY,
	STREAK_TEXTURE,
	SWIRL_GEOMETRY,
	WARP_DOWN_MATERIALS,
	WARP_SPARK_COUNT,
	WARP_SPARK_GEOMETRY,
	WARP_UP_MATERIALS,
} from "./warp-parts";
import type { WarpMaterials } from "./warp-parts";

export type WarpScene = {
	// 元の階と先の階の、マスの床の真ん中
	from: Vec3;
	to: Vec3;
	up: boolean;
	stage: WarpStage;
	progress: number;
};

export type WarpHandle = {
	// nullなら隠す
	update: (warp: WarpScene | null) => void;
};

const sparkMatrix = new Matrix4();
const sparkPosition = new Vector3();
const sparkScale = new Vector3();
const NO_ROTATION = new Quaternion();
// 光の粒を、らせんの上に間を空けて並べる角度（黄金角）
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SPARK_RADIUS = 0.42;
// 柱を、高いほうの床より上へどれだけ突き抜けさせるか（上から見ても柱の長さが分かるようにする）
const BEAM_OVERSHOOT = 1.2;
// 壁やロボットより後に描いて、手前に重ねる
const RENDER_ORDER = 10;

function setMaterials(
	materials: WarpMaterials,
	meshes: {
		beam: Mesh | null;
		core: Mesh | null;
		burst: Mesh | null;
		swirl: Mesh | null;
		sparks: InstancedMesh | null;
	},
): void {
	if (meshes.beam !== null) meshes.beam.material = materials.beam;
	if (meshes.core !== null) meshes.core.material = materials.core;
	if (meshes.burst !== null) meshes.burst.material = materials.burst;
	if (meshes.swirl !== null) meshes.swirl.material = materials.swirl;
	if (meshes.sparks !== null) meshes.sparks.material = materials.spark;
}

export function WarpEffect({ ref }: { ref: Ref<WarpHandle> }) {
	const root = useRef<Group>(null);
	const beam = useRef<Mesh>(null);
	const core = useRef<Mesh>(null);
	const burst = useRef<Mesh>(null);
	const swirl = useRef<Mesh>(null);
	const sparks = useRef<InstancedMesh>(null);

	useImperativeHandle(ref, () => ({
		update(warp) {
			const group = root.current;
			if (group === null) return;
			group.visible = warp !== null;
			if (warp === null) return;

			const look = warpLook(warp.stage, warp.progress);
			const materials = warp.up ? WARP_UP_MATERIALS : WARP_DOWN_MATERIALS;
			setMaterials(materials, {
				beam: beam.current,
				core: core.current,
				burst: burst.current,
				swirl: swirl.current,
				sparks: sparks.current,
			});

			// 柱は、低いほうの床から、高いほうの床を少し突き抜けるところまで
			const [x, fromY, z] = warp.from;
			const toY = warp.to[1];
			const bottom = Math.min(fromY, toY);
			const height = Math.abs(toY - fromY) + BEAM_OVERSHOOT;
			for (const mesh of [beam.current, core.current]) {
				mesh?.position.set(x, bottom, z);
				mesh?.scale.set(1, height, 1);
			}
			materials.beam.opacity = look.beamOpacity * 0.8;
			materials.core.opacity = look.beamOpacity;
			// 模様を、移る向きに流す
			STREAK_TEXTURE.offset.y = warp.up ? -look.beamFlow : look.beamFlow;

			const burstY = look.burstAt === "from" ? fromY : toY;
			burst.current?.position.set(x, burstY, z);
			burst.current?.scale.setScalar(look.burstScale);
			materials.burst.opacity = look.burstOpacity;

			// 輪と光の粒は、元の階から先の階へ進む
			const travelY = fromY + (toY - fromY) * look.travel;
			swirl.current?.position.set(x, travelY, z);
			swirl.current?.rotation.set(0, look.spin, 0);
			materials.swirl.opacity = look.beamOpacity;

			const mesh = sparks.current;
			if (mesh !== null) {
				for (let index = 0; index < WARP_SPARK_COUNT; index += 1) {
					// 粒ごとに少しずつ遅れて、柱の下から上（または上から下）へ進む
					const along = (look.travel * 2 + index / WARP_SPARK_COUNT) % 1;
					const angle = look.spin + index * GOLDEN_ANGLE;
					sparkPosition.set(
						x + Math.cos(angle) * SPARK_RADIUS,
						fromY + (toY - fromY) * along,
						z + Math.sin(angle) * SPARK_RADIUS,
					);
					// 柱の端の近くでは小さくして、ぷつりと消えないようにする
					sparkScale.setScalar(Math.sin(along * Math.PI) * look.beamOpacity);
					mesh.setMatrixAt(index, sparkMatrix.compose(sparkPosition, NO_ROTATION, sparkScale));
				}
				mesh.instanceMatrix.needsUpdate = true;
			}
		},
	}));

	return (
		<group ref={root} visible={false}>
			<mesh
				ref={beam}
				geometry={BEAM_GEOMETRY}
				material={WARP_UP_MATERIALS.beam}
				renderOrder={RENDER_ORDER}
			/>
			<mesh
				ref={core}
				geometry={BEAM_CORE_GEOMETRY}
				material={WARP_UP_MATERIALS.core}
				renderOrder={RENDER_ORDER}
			/>
			<mesh
				ref={burst}
				geometry={BURST_GEOMETRY}
				material={WARP_UP_MATERIALS.burst}
				renderOrder={RENDER_ORDER}
			/>
			<mesh
				ref={swirl}
				geometry={SWIRL_GEOMETRY}
				material={WARP_UP_MATERIALS.swirl}
				renderOrder={RENDER_ORDER}
			/>
			<instancedMesh
				ref={sparks}
				args={[undefined, undefined, WARP_SPARK_COUNT]}
				geometry={WARP_SPARK_GEOMETRY}
				material={WARP_UP_MATERIALS.spark}
				renderOrder={RENDER_ORDER}
				// 粒は柱にそって動き続けるので、範囲の計算で消されないようにする
				frustumCulled={false}
			/>
		</group>
	);
}
