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
const LABEL_FILL = "#a5d8ff";
const LABEL_OUTLINE = "#1864ab";

async function createLabelMaterial(text: string): Promise<MeshStandardMaterial> {
	// 読み込めなくても解決するので、そのときは代わりのフォントで描く
	await document.fonts.load(FONT);
	const canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 128;
	const context = canvas.getContext("2d");
	if (context === null) throw new Error("2Dの描画ができない");
	context.font = FONT;
	context.textAlign = "center";
	/*
	 * 字の上端から下端までを測り、板の上下の真ん中に置く
	 * textBaseline="middle"はフォントの枠の真ん中なので、字の形とずれ、縁の分も含めると下が板からはみ出す
	 */
	context.textBaseline = "alphabetic";
	const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } =
		context.measureText(text);
	const x = canvas.width / 2;
	const y = (canvas.height + ascent - descent) / 2;
	// 背景（明るい青）との差をはっきりさせるため、薄い青の字に濃い青の縁を付ける
	context.lineJoin = "round";
	context.lineWidth = 24;
	context.strokeStyle = LABEL_OUTLINE;
	context.strokeText(text, x, y);
	context.fillStyle = LABEL_FILL;
	context.fillText(text, x, y);

	// 色は絵に描いた色のまま使い、その色で弱く光らせる（光るのは主に明るい字の部分）
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	return new MeshStandardMaterial({
		map: texture,
		color: "#ffffff",
		emissive: "#ffffff",
		emissiveMap: texture,
		emissiveIntensity: 0.25,
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
