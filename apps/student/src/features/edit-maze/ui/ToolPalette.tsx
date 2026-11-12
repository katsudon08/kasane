/*
 * 道具のパレット（仕様書README.mdの「めいろをつくる / 変える」）
 * ゆか / かべ / 穴 / スタート / ゴール / 上へテレポート / 下へテレポート / かぎ
 * （壁・床・鍵は小学校で習わない漢字なのでひらがな）。アイコンは2Dのマスと同じ
 * 選んでいる道具は、枠と色で示す
 */
import type { Cell, Direction } from "@kasane/core";
import { UnstyledButton } from "@mantine/core";
import { memo } from "react";
import type { ReactNode } from "react";

import { CellIcon } from "../../../entities/maze";

import classes from "./ToolPalette.module.css";

const TOOLS: readonly { cell: Cell; label: ReactNode }[] = [
	{ cell: "floor", label: "ゆか" },
	{ cell: "wall", label: "かべ" },
	{
		cell: "hole",
		label: (
			<ruby>
				穴<rt>あな</rt>
			</ruby>
		),
	},
	{ cell: "start", label: "スタート" },
	{ cell: "goal", label: "ゴール" },
	{
		cell: "teleportUp",
		label: (
			<>
				<ruby>
					上<rt>うえ</rt>
				</ruby>
				へテレポート
			</>
		),
	},
	{
		cell: "teleportDown",
		label: (
			<>
				<ruby>
					下<rt>した</rt>
				</ruby>
				へテレポート
			</>
		),
	},
	{ cell: "key", label: "かぎ" },
];

type Props = {
	tool: Cell;
	// スタートのアイコンの矢印は、今の迷路のロボットの向きにする
	startDirection: Direction;
	onChoose: (tool: Cell) => void;
};

export const ToolPalette = memo(function ToolPalette({ tool, startDirection, onChoose }: Props) {
	return (
		<div className={classes.palette} role="group" aria-label="道具">
			{TOOLS.map(({ cell, label }) => (
				<UnstyledButton
					key={cell}
					className={classes.tool}
					data-selected={cell === tool || undefined}
					aria-pressed={cell === tool}
					onClick={() => onChoose(cell)}
				>
					<CellIcon cell={cell} startDirection={startDirection} className={classes.icon} />
					<span>{label}</span>
				</UnstyledButton>
			))}
		</div>
	);
});
