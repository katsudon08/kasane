/*
 * 迷路の一つの階のマス（仕様書README.mdの「迷路の3D」の表）
 * 床・壁・穴は数が多いのでInstancedMeshで描き、スタート・ゴール・テレポート・鍵は数が少ないので一つずつ置く
 */
import type { Direction, Position } from "@kasane/core";
import { Billboard } from "@react-three/drei";
import { Suspense } from "react";

import { DIRECTION_ANGLES, cellCenter } from "../../lib/scene-layout";
import type { CellPositions } from "../../lib/scene-layout";
import { Instances } from "./Instances";
import { LayerLabel } from "./LayerLabel";
import {
	ARROW_GEOMETRY,
	ARROW_HEIGHT,
	FLAG_GEOMETRY,
	FLAG_POLE_GEOMETRY,
	HOLE_GEOMETRY,
	HOLE_RING_GEOMETRY,
	KEY_RING_GEOMETRY,
	KEY_SHAFT_GEOMETRY,
	KEY_TEETH_GEOMETRY,
	START_GEOMETRY,
	TILE_GEOMETRY,
	WALL_GEOMETRY,
} from "./parts";
import type { PartMaterials } from "./parts";

type Props = {
	size: number;
	layer: number;
	// この階のマスだけの位置
	positions: CellPositions;
	startDirection: Direction;
	materials: PartMaterials;
};

export function LayerModel({ size, layer, positions, startDirection, materials }: Props) {
	const { tiles, byCell } = positions;
	const keyOf = ({ y, x }: Position) => `${y}-${x}`;

	return (
		<group>
			<Instances size={size} positions={tiles} geometry={TILE_GEOMETRY} material={materials.tile} />
			<Instances
				size={size}
				positions={byCell.wall}
				geometry={WALL_GEOMETRY}
				material={materials.wall}
			/>
			<Instances
				size={size}
				positions={byCell.hole}
				geometry={HOLE_GEOMETRY}
				material={materials.hole}
			/>
			<Instances
				size={size}
				positions={byCell.hole}
				geometry={HOLE_RING_GEOMETRY}
				material={materials.holeRing}
			/>

			{byCell.start.map((position) => (
				<mesh
					key={keyOf(position)}
					geometry={START_GEOMETRY}
					material={materials.start}
					position={cellCenter(size, position)}
					rotation-y={DIRECTION_ANGLES[startDirection]}
				/>
			))}

			{byCell.goal.map((position) => (
				<group key={keyOf(position)} position={cellCenter(size, position)}>
					<mesh geometry={FLAG_POLE_GEOMETRY} material={materials.flagPole} />
					<mesh geometry={FLAG_GEOMETRY} material={materials.flag} />
				</group>
			))}

			{byCell.teleportUp.map((position) => (
				<TeleportArrow
					key={keyOf(position)}
					size={size}
					position={position}
					up
					materials={materials}
				/>
			))}
			{byCell.teleportDown.map((position) => (
				<TeleportArrow
					key={keyOf(position)}
					size={size}
					position={position}
					up={false}
					materials={materials}
				/>
			))}

			{byCell.key.map((position) => (
				// 鍵の形が分かるよう、斜めに向けて立てる
				<group key={keyOf(position)} position={cellCenter(size, position)} rotation-y={Math.PI / 4}>
					<mesh geometry={KEY_RING_GEOMETRY} material={materials.key} />
					<mesh geometry={KEY_SHAFT_GEOMETRY} material={materials.key} />
					<mesh geometry={KEY_TEETH_GEOMETRY} material={materials.key} />
				</group>
			))}

			{/* 文字の材質はフォントを読み込んでから作るので、待つ間は文字だけ出さない */}
			<Suspense fallback={null}>
				<LayerLabel size={size} layer={layer} />
			</Suspense>
		</group>
	);
}

type TeleportArrowProps = {
	size: number;
	position: Position;
	up: boolean;
	materials: PartMaterials;
};

// 上へは赤い上向き、下へは青い下向きの矢印。常にカメラのほうを向かせる
function TeleportArrow({ size, position, up, materials }: TeleportArrowProps) {
	const [x, y, z] = cellCenter(size, position);
	return (
		<Billboard position={[x, y + ARROW_HEIGHT, z]}>
			<mesh
				geometry={ARROW_GEOMETRY}
				material={up ? materials.teleportUp : materials.teleportDown}
				rotation-z={up ? 0 : Math.PI}
			/>
		</Billboard>
	);
}
