/*
 * 迷路の3Dと2Dの見た目を確かめる（仕様書README.mdの「迷路の3D」「迷路の2D」の表）
 * 8種のマスをすべて置いた2階の迷路を、3Dと各階の2Dで並べて描く。サーバーとDBは要らない
 * スタートの向きを変えると、ロボットと矢印の向きが変わる
 */
import type { Direction, Maze } from "@kasane/core";
import {
	FLOOR,
	GOAL,
	HOLE,
	KEY,
	START,
	TELEPORT_DOWN,
	TELEPORT_UP,
	WALL,
	validateMaze,
} from "@kasane/core";
import { Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { LazyMazeScene } from "./maze-3d/LazyMazeScene";
import { MazeMap } from "./maze-map/MazeMap";

const F = FLOOR;
const W = WALL;

// 1階: スタート・床・壁・穴・鍵・上へテレポート、2階: 下へテレポート・鍵・穴・ゴール
const LAYERS: Maze["layers"] = [
	[
		[START, F, F, W, HOLE, F],
		[F, W, KEY, F, F, F],
		[F, HOLE, F, W, W, F],
		[F, F, F, TELEPORT_UP, F, F],
		[W, W, F, F, KEY, W],
		[F, F, F, W, F, F],
	],
	[
		[W, W, W, W, W, W],
		[W, F, F, F, F, W],
		[W, F, KEY, HOLE, F, W],
		[W, F, F, F, F, W],
		[W, F, TELEPORT_DOWN, W, GOAL, W],
		[W, W, W, W, W, W],
	],
];

type Args = { startDirection: Direction };

function AllCells({ startDirection }: Args) {
	const maze: Maze = { layers: LAYERS, startDirection };
	const result = validateMaze(maze);

	return (
		<Stack gap="md" p="md">
			{!result.ok && <Text c="red">validateMazeを通らない: {result.reason}</Text>}
			<LazyMazeScene maze={maze} />
			<Group gap="md" align="flex-start">
				{maze.layers.map((_, layer) => (
					// 階は並びが変わらないので、階の番号をkeyにする
					<Stack key={layer} gap={4} w={240}>
						<Text>{layer + 1}階の2D</Text>
						<MazeMap maze={maze} layer={layer} />
					</Stack>
				))}
			</Group>
		</Stack>
	);
}

const meta = {
	title: "entities/maze/8種のマス",
	component: AllCells,
	args: { startDirection: "east" },
	argTypes: {
		startDirection: { control: "inline-radio", options: ["north", "east", "south", "west"] },
	},
} satisfies Meta<typeof AllCells>;

export default meta;

export const AllCellTypes: StoryObj<typeof meta> = {};
