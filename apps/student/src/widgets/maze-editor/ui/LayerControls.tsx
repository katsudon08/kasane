/*
 * 階の切り替えと、階を足す・減らすボタン（仕様書README.mdの「めいろをつくる / 変える」）
 * 階は3Dの文字と同じ「1F」「2F」「3F」で横に並べ、今編集している階は青の塗りつぶし、他は枠だけにする
 * まだない階も灰色で並べておき、階を足しても並びがずれないようにする
 * 減らす（−）は左、足す（＋）は右に置く。どちらも押せなくはせず、できないときは理由の文言を出す
 */
import { UnstyledButton } from "@mantine/core";
import { Minus, Plus } from "lucide-react";
import { memo, useMemo } from "react";

import { MAX_LAYERS } from "../../../features/edit-maze";
import { Segmented } from "./Segmented";
import type { SegmentedItem } from "./Segmented";

import classes from "./MazeEditor.module.css";

type Props = {
	layerCount: number;
	layer: number;
	onChoose: (layer: number) => void;
	onAdd: () => void;
	onRemove: () => void;
};

export const LayerControls = memo(function LayerControls({
	layerCount,
	layer,
	onChoose,
	onAdd,
	onRemove,
}: Props) {
	const items = useMemo<SegmentedItem<number>[]>(
		() =>
			Array.from({ length: MAX_LAYERS }, (_, index) => ({
				value: index,
				label: `${index + 1}F`,
				disabled: index >= layerCount,
			})),
		[layerCount],
	);

	return (
		<div className={classes.layerControls}>
			<UnstyledButton className={classes.stepButton} onClick={onRemove} aria-label="階を減らす">
				<Minus aria-hidden size={32} />
			</UnstyledButton>
			<Segmented items={items} selected={layer} onChoose={onChoose} label="階" />
			<UnstyledButton className={classes.stepButton} onClick={onAdd} aria-label="階を足す">
				<Plus aria-hidden size={32} />
			</UnstyledButton>
		</div>
	);
});
