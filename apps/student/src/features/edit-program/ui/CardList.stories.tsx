/*
 * カードの並びの見た目を確かめる（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」）
 * くりかえしの入れ子・「くりかえし終わり」の行・差し込み位置の線・今のカード・止まったカードを並べる。サーバーとカメラは要らない
 * カードを押すと差し込み位置が動き、開閉ボタンでくりかえしの中を開いたり閉じたりできる
 */
import type { Command, Program } from "@kasane/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import type { Cursor } from "../lib/program-edit";
import type { CurrentCard } from "./CardList";
import { CardList } from "./CardList";

// 1 前、2 くりかえす［3 右、4 くりかえす［5 うめる、6 前］］、7 左
const PROGRAM: Program = [
	{ type: "forward" },
	{
		type: "repeat",
		times: 2,
		body: [
			{ type: "right" },
			{ type: "repeat", times: 3, body: [{ type: "fill" }, { type: "forward" }] },
		],
	},
	{ type: "left" },
];

type Props = {
	editable: boolean;
	current: CurrentCard | null;
};

function Playground({ editable, current }: Props) {
	const [cursor, setCursor] = useState<Cursor>([1, 1, 2]);
	const [collapsed, setCollapsed] = useState<ReadonlySet<Command>>(new Set());

	const toggle = (path: number[]) => {
		let command: Command | undefined = PROGRAM[path[0] ?? 0];
		for (const index of path.slice(1)) {
			command = command?.type === "repeat" ? command.body[index] : undefined;
		}
		if (command === undefined) return;
		const next = new Set(collapsed);
		if (!next.delete(command)) next.add(command);
		setCollapsed(next);
	};

	return (
		<div style={{ width: 560 }}>
			<CardList
				program={PROGRAM}
				cursor={cursor}
				collapsed={collapsed}
				current={current}
				arrived={null}
				editable={editable}
				onCursor={setCursor}
				onRemove={() => undefined}
				onToggle={toggle}
				onTimes={() => undefined}
			/>
		</div>
	);
}

const meta = {
	title: "features/edit-program/カードの並び",
	component: Playground,
	args: { editable: true, current: null },
} satisfies Meta<typeof Playground>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Building: Story = {};

export const Running: Story = {
	args: { editable: false, current: { path: [1, 1, 0], failed: false } },
};

export const Failed: Story = {
	args: { editable: false, current: { path: [1, 0], failed: true } },
};
