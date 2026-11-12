/*
 * いくつかの中から一つを選ぶボタンの並び（エディタの「階」と「大きさ」で同じ形にする）
 * 選んでいるものは青の塗りつぶし、他は枠だけ（仕様書README.mdの「めいろをつくる / 変える」の階の切り替え）
 * 並ぶ数は変えず、選べないものは灰色にして、選べるものが増えても並びがずれないようにする
 */
import { UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";

import classes from "./MazeEditor.module.css";

export type SegmentedItem<Value> = { value: Value; label: ReactNode; disabled?: boolean };

type Props<Value> = {
	items: readonly SegmentedItem<Value>[];
	selected: Value;
	onChoose: (value: Value) => void;
	// 読み上げのための、並びの名前
	label: string;
};

export function Segmented<Value extends string | number>({
	items,
	selected,
	onChoose,
	label,
}: Props<Value>) {
	return (
		<div className={classes.segmented} role="group" aria-label={label}>
			{items.map(({ value, label: itemLabel, disabled = false }) => (
				<UnstyledButton
					key={value}
					className={classes.segment}
					data-selected={value === selected || undefined}
					aria-pressed={value === selected}
					disabled={disabled}
					onClick={() => onChoose(value)}
				>
					{itemLabel}
				</UnstyledButton>
			))}
		</div>
	);
}
