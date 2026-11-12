/*
 * 穴をうめるときの光る球（仕様書README.mdの「1ターンの動き」のfill）
 * 見た目の値はorbLookで求め、useFrameから呼ばれるupdateでrefに書き込む（1フレームごとにReactのstateを更新しない）
 */
import { Billboard } from "@react-three/drei";
import { useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import { Matrix4, Quaternion, Vector3 } from "three";
import type { Group, InstancedMesh, Mesh } from "three";

import { orbLook } from "../../lib/orb-look";
import type { Vec3 } from "../../lib/scene-layout";
import {
	ORB_CORE_GEOMETRY,
	ORB_CORE_MATERIAL,
	ORB_GLOW_GEOMETRY,
	ORB_GLOW_MATERIAL,
	ORB_RING_GEOMETRY,
	ORB_RING_MATERIAL,
	ORB_SHELL_GEOMETRY,
	ORB_SHELL_MATERIAL,
	ORB_SHOCK_GEOMETRY,
	ORB_SHOCK_MATERIAL,
	ORB_SPARK_COUNT,
	ORB_SPARK_GEOMETRY,
	ORB_SPARK_MATERIAL,
} from "./orb-parts";

export type OrbHandle = {
	// at: 穴のマスの床の真ん中。nullなら隠す。progress: うめる区切りの進み具合（0〜1）
	update: (at: Vec3 | null, progress: number) => void;
};

// 光の粒の並びを作るための作業用（毎フレーム作らない）
const sparkMatrix = new Matrix4();
const sparkPosition = new Vector3();
const sparkScale = new Vector3();
const NO_ROTATION = new Quaternion();

export function OrbEffect({ ref }: { ref: Ref<OrbHandle> }) {
	const root = useRef<Group>(null);
	const floating = useRef<Group>(null);
	const core = useRef<Mesh>(null);
	const shell = useRef<Mesh>(null);
	const glow = useRef<Mesh>(null);
	const ringA = useRef<Mesh>(null);
	const ringB = useRef<Mesh>(null);
	const sparks = useRef<InstancedMesh>(null);
	const shock = useRef<Mesh>(null);

	useImperativeHandle(ref, () => ({
		update(at, progress) {
			const group = root.current;
			if (group === null) return;
			group.visible = at !== null;
			if (at === null) return;

			const look = orbLook(progress);
			group.position.set(...at);
			floating.current?.position.set(0, look.height, 0);
			core.current?.scale.set(look.coreScale, look.coreScale * look.coreSquash, look.coreScale);
			shell.current?.scale.set(look.coreScale, look.coreScale * look.coreSquash, look.coreScale);
			glow.current?.scale.setScalar(look.glowScale);
			ORB_GLOW_MATERIAL.opacity = look.glowOpacity;

			// 2本の輪は、傾きの違う軸のまわりを逆向きに回る
			ringA.current?.scale.setScalar(look.ringScale);
			ringA.current?.rotation.set(Math.PI / 2.6, look.ringAngle, 0);
			ringB.current?.scale.setScalar(look.ringScale * 0.85);
			ringB.current?.rotation.set(-Math.PI / 3.2, -look.ringAngle * 1.3, Math.PI / 5);

			// 光の粒は、球のまわりを回りながら広がる。上下に少しずらして立体に見せる
			const mesh = sparks.current;
			if (mesh !== null) {
				for (let index = 0; index < ORB_SPARK_COUNT; index += 1) {
					const angle = look.sparkAngle + (index / ORB_SPARK_COUNT) * Math.PI * 2;
					sparkPosition.set(
						Math.cos(angle) * look.sparkRadius,
						Math.sin(angle * 2 + index) * 0.15,
						Math.sin(angle) * look.sparkRadius,
					);
					sparkScale.setScalar(look.sparkScale);
					mesh.setMatrixAt(index, sparkMatrix.compose(sparkPosition, NO_ROTATION, sparkScale));
				}
				mesh.instanceMatrix.needsUpdate = true;
			}

			shock.current?.scale.setScalar(look.shockScale);
			ORB_SHOCK_MATERIAL.opacity = look.shockOpacity;
			if (shock.current !== null) shock.current.visible = look.shockOpacity > 0;
		},
	}));

	return (
		<group ref={root} visible={false}>
			<group ref={floating}>
				<Billboard>
					<mesh ref={glow} geometry={ORB_GLOW_GEOMETRY} material={ORB_GLOW_MATERIAL} />
				</Billboard>
				<mesh ref={shell} geometry={ORB_SHELL_GEOMETRY} material={ORB_SHELL_MATERIAL} />
				<mesh ref={core} geometry={ORB_CORE_GEOMETRY} material={ORB_CORE_MATERIAL} />
				<mesh ref={ringA} geometry={ORB_RING_GEOMETRY} material={ORB_RING_MATERIAL} />
				<mesh ref={ringB} geometry={ORB_RING_GEOMETRY} material={ORB_RING_MATERIAL} />
				<instancedMesh
					ref={sparks}
					args={[undefined, undefined, ORB_SPARK_COUNT]}
					geometry={ORB_SPARK_GEOMETRY}
					material={ORB_SPARK_MATERIAL}
					// 粒は球のまわりで動き続けるので、範囲の計算で消されないようにする
					frustumCulled={false}
				/>
			</group>
			<mesh ref={shock} geometry={ORB_SHOCK_GEOMETRY} material={ORB_SHOCK_MATERIAL} />
		</group>
	);
}
