/*
 * ロボット（仕様書README.mdの「迷路の3D」）
 * 前身ProgPathの3Dモデルを、STARTのマスにstartDirectionの向きで立たせる
 * モデル（robot.glb）は、ProgPathのrobot.gltf（約44MB・約77万頂点）を、gltf-transformで
 * 法線とUVを捨てて溶接→頂点の削減（比0.05・誤差0.002）→法線の付け直し→meshoptの圧縮をして軽くしたもの
 * モデルは回していないとき+x（east）を向き、ProgPathでは1マスが10の大きさだった
 */
import type { Direction, Position } from "@kasane/core";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Vector3 } from "three";

import { DIRECTION_ANGLES, cellCenter } from "../../lib/scene-layout";
import robotUrl from "./robot.glb?url";

// ProgPathの1マス（10）に対して、ロボットが1マスの7割ほどの幅になる大きさ
const ROBOT_SCALE = 0.14;

// 足元を原点に、真ん中を原点の真上に合わせたモデル。置く場所と向きは、包むgroupで決める
export function RobotModel() {
	// dracoの展開処理は外部（gstatic）から取りに行くので使わない。meshoptの展開処理はライブラリに入っている
	const { scene } = useGLTF(robotUrl, false, true);
	const model = useMemo(() => {
		const clone = scene.clone(true);
		clone.scale.setScalar(ROBOT_SCALE);
		const box = new Box3().setFromObject(clone);
		const center = box.getCenter(new Vector3());
		clone.position.set(-center.x, -box.min.y, -center.z);
		return clone;
	}, [scene]);

	return <primitive object={model} />;
}

type Props = { size: number; position: Position; direction: Direction };

// しょうさい画面の、スタートのマスに立って動かないロボット
export function Robot({ size, position, direction }: Props) {
	return (
		<group position={cellCenter(size, position)} rotation-y={DIRECTION_ANGLES[direction]}>
			<RobotModel />
		</group>
	);
}
