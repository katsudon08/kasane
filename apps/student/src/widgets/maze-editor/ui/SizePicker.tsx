/*
 * 迷路の大きさ（一辺5・6・7）を選ぶ（仕様書README.mdの「めいろをつくる / 変える」）
 * 新しく作るときだけ出す。一度でも形を変えた後は選べない（途中で変えると形が崩れるため）
 */
import { Button, Group, Text } from "@mantine/core";
import { memo } from "react";

import type { MazeSize } from "../../../features/edit-maze";

const SIZES: readonly MazeSize[] = [5, 6, 7];

type Props = {
	size: number;
	disabled: boolean;
	onChoose: (size: MazeSize) => void;
};

export const SizePicker = memo(function SizePicker({ size, disabled, onChoose }: Props) {
	return (
		<Group gap="sm" role="group" aria-label="大きさ">
			<Text fw={700}>
				<ruby>
					大<rt>おお</rt>
				</ruby>
				きさ
			</Text>
			{SIZES.map((candidate) => (
				<Button
					key={candidate}
					variant={candidate === size ? "light" : "outline"}
					aria-pressed={candidate === size}
					// 選べなくなった後も、今の大きさは分かるように残す
					disabled={disabled && candidate !== size}
					onClick={() => onChoose(candidate)}
				>
					{candidate}×{candidate}
				</Button>
			))}
		</Group>
	);
});
