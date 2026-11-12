/*
 * 各階の横の「1F」「2F」の3Dの文字（仕様書README.mdの「迷路の3D」）
 * 薄い青で弱く光らせ（材質の発光）、常にカメラのほうを向かせる
 * 文字は、画面と同じBIZ UDPGothicを読み込んでから板に描く（外部からフォントを取りに行かない）
 */
import { Billboard } from "@react-three/drei";
import { use } from "react";
import { CanvasTexture, DoubleSide, MeshStandardMaterial, SRGBColorSpace } from "three";

import { layerLabelPosition } from "../../lib/scene-layout";
import { LABEL_GEOMETRY } from "./parts";

const FONT = '700 120px "BIZ UDPGothic", sans-serif';

async function createLabelMaterial(text: string): Promise<MeshStandardMaterial> {
	// 読み込めなくても解決するので、そのときは代わりのフォントで描く
	await document.fonts.load(FONT);
	const canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 128;
	const context = canvas.getContext("2d");
	if (context === null) throw new Error("2Dの描画ができない");
	context.font = FONT;
	context.fillStyle = "#ffffff";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);

	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	return new MeshStandardMaterial({
		map: texture,
		color: "#74c0fc",
		emissive: "#339af0",
		emissiveMap: texture,
		emissiveIntensity: 0.5,
		transparent: true,
		side: DoubleSide,
		depthWrite: false,
	});
}

// 階の文字は1F〜3Fの3つだけなので、一度作った材質を使い回す
const labelMaterials = new Map<string, Promise<MeshStandardMaterial>>();

function labelMaterial(text: string): Promise<MeshStandardMaterial> {
	const cached = labelMaterials.get(text);
	if (cached !== undefined) return cached;
	const created = createLabelMaterial(text);
	labelMaterials.set(text, created);
	return created;
}

type Props = { size: number; layer: number };

export function LayerLabel({ size, layer }: Props) {
	const material = use(labelMaterial(`${layer + 1}F`));

	return (
		<Billboard position={layerLabelPosition(size, layer)}>
			<mesh geometry={LABEL_GEOMETRY} material={material} />
		</Billboard>
	);
}
