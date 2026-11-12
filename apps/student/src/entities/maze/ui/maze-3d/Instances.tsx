/*
 * 同じ形のマスを、種類ごとにInstancedMesh一つで描く（仕様書backend.mdの「3D（React Three Fiber）」）
 * 形はマスの中心に合わせてあるので、各マスへは平行移動だけで置く
 */
import type { Position } from "@kasane/core";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { Matrix4 } from "three";
import type { BufferGeometry, InstancedMesh, Material } from "three";

import { cellCenter } from "../../lib/scene-layout";

type Props = {
	size: number;
	positions: Position[];
	geometry: BufferGeometry;
	material: Material;
};

export function Instances({ size, positions, geometry, material }: Props) {
	const ref = useRef<InstancedMesh>(null);
	const invalidate = useThree((state) => state.invalidate);

	useLayoutEffect(() => {
		const mesh = ref.current;
		if (mesh === null) return;
		const matrix = new Matrix4();
		positions.forEach((position, index) => {
			const [x, y, z] = cellCenter(size, position);
			mesh.setMatrixAt(index, matrix.makeTranslation(x, y, z));
		});
		mesh.instanceMatrix.needsUpdate = true;
		mesh.computeBoundingSphere();
		// 描き直しは求めたときだけなので、置き直したら描き直す
		invalidate();
	}, [size, positions, invalidate]);

	if (positions.length === 0) return null;
	/*
	 * 数が変わると作り直す必要があるので、数をkeyにする
	 * 形と材質は、作るときの引数（args）ではなく属性で渡す。argsが変わると作り直されて各マスの位置が原点に戻るが、
	 * プレイ画面ではロボットが階を移るたびに材質（透かし方）が変わるため
	 */
	return (
		<instancedMesh
			key={positions.length}
			ref={ref}
			args={[undefined, undefined, positions.length]}
			geometry={geometry}
			material={material}
		/>
	);
}
