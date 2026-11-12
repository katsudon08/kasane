/*
 * 迷路の大きさ（一辺5・6・7）を選ぶ（仕様書README.mdの「めいろをつくる / 変える」）
 * 新しく作るときだけ出す。一度でも形を変えた後は、今の大きさのほかは選べない（途中で変えると形が崩れるため）
 * 見た目は階の切り替えと同じ並びにする
 */
import { memo, useMemo } from "react";

import type { MazeSize } from "../../../features/edit-maze";
import { Segmented } from "./Segmented";
import type { SegmentedItem } from "./Segmented";

const SIZES: readonly MazeSize[] = [5, 6, 7];

type Props = {
	size: number;
	disabled: boolean;
	onChoose: (size: MazeSize) => void;
};

export const SizePicker = memo(function SizePicker({ size, disabled, onChoose }: Props) {
	const items = useMemo<SegmentedItem<MazeSize>[]>(
		() =>
			SIZES.map((candidate) => ({
				value: candidate,
				label: `${candidate}×${candidate}`,
				disabled: disabled && candidate !== size,
			})),
		[disabled, size],
	);
	return <Segmented items={items} selected={size as MazeSize} onChoose={onChoose} label="大きさ" />;
});
