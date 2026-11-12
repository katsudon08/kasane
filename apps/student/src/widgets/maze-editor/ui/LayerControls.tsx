/*
 * 階の切り替えと、階を足す・減らすボタン（仕様書README.mdの「めいろをつくる / 変える」）
 * 「1階」「2階」「3階」を横に並べ、今編集している階は青の塗りつぶし、他は枠だけにする
 * まだない階も灰色で並べておき、階を足しても並びがずれないようにする
 * 減らすは左、足すは右に置く。どちらも押せなくはせず、できないときは理由の文言を出す
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
				label: (
					<>
						{index + 1}
						<ruby>
							階<rt>かい</rt>
						</ruby>
					</>
				),
				disabled: index >= layerCount,
			})),
		[layerCount],
	);

	return (
		<div className={classes.layerControls}>
			<UnstyledButton className={classes.stepButton} onClick={onRemove}>
				<Minus aria-hidden size={24} />
				<span>
					<ruby>
						階<rt>かい</rt>
					</ruby>
					を
					<ruby>
						減<rt>へ</rt>
					</ruby>
					らす
				</span>
			</UnstyledButton>
			<Segmented items={items} selected={layer} onChoose={onChoose} label="階" />
			<UnstyledButton className={classes.stepButton} onClick={onAdd}>
				<Plus aria-hidden size={24} />
				<span>
					<ruby>
						階<rt>かい</rt>
					</ruby>
					を
					<ruby>
						足<rt>た</rt>
					</ruby>
					す
				</span>
			</UnstyledButton>
		</div>
	);
});
