/*
 * 迷路の2D（仕様書README.mdの「迷路の2D（エディタとミニマップで共通）」）
 * エディタのマス目と道具のアイコン、ホームの「自分の迷路」のミニマップ、プレイ画面の右上のミニマップで使う
 * SVGで描き、拡大しても崩れないようにする。1マスを1の大きさにして、迷路の一辺をviewBoxにする
 * 旗・鍵・スタートの矢印はLucide Reactのアイコン、穴とテレポートの矢印は自前のSVG
 */
import type { Cell, Direction, Maze } from "@kasane/core";
import { Flag, Key } from "lucide-react";
import { memo, useId } from "react";

import { START_CHEVRONS } from "../../lib/start-chevrons";

const COLORS = {
	floor: "#ced4da",
	crack: "#a3aab2",
	grid: "#f1f3f5",
	wall: "#495057",
	hole: "#000000",
	holeRing: "#ff8a00",
	start: "#1c7ed6",
	goal: "#2f9e44",
	teleportUp: "#e03131",
	teleportDown: "#1971c2",
	key: "#e8a800",
	robot: "#f76707",
	robotEdge: "#ffffff",
} as const;

// アイコンを置く余白（1マスに対する割合）
const ICON_INSET = 0.1;
const ICON_SIZE = 1 - ICON_INSET * 2;

// プレイ画面で、ロボットの位置と向きを重ねて描く
export type MapRobot = { x: number; y: number; direction: Direction };

type Props = {
	maze: Maze;
	// 描く階（0が1階）
	layer: number;
	robot?: MapRobot;
	className?: string;
};

// ホームでは迷路の数だけ並ぶので、迷路が変わらなければ描き直さない
export const MazeMap = memo(function MazeMap({ maze, layer, robot, className }: Props) {
	const glowId = useGlowId();
	const rows = maze.layers[layer] ?? [];
	const size = rows.length;

	return (
		<svg viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden>
			<GlowFilter id={glowId} />
			{rows.map((cells, y) =>
				cells.map((cell, x) => (
					// マスは並びが変わらないので、位置をkeyにする
					<g key={`${y}-${x}`} transform={`translate(${x} ${y})`}>
						<MapCell cell={cell} startDirection={maze.startDirection} glow={`url(#${glowId})`} />
					</g>
				)),
			)}
			{robot !== undefined && <RobotMark robot={robot} />}
		</svg>
	);
});

type CellIconProps = {
	cell: Cell;
	// スタートの矢印の向き
	startDirection?: Direction;
	className?: string;
};

// 1マスだけを、迷路の2Dと同じ見た目で描く（エディタの道具のアイコン）
export const CellIcon = memo(function CellIcon({
	cell,
	startDirection = "east",
	className,
}: CellIconProps) {
	const glowId = useGlowId();
	return (
		<svg viewBox="0 0 1 1" className={className} aria-hidden>
			<GlowFilter id={glowId} />
			<MapCell cell={cell} startDirection={startDirection} glow={`url(#${glowId})`} />
		</svg>
	);
});

// 一つの画面に複数のミニマップやアイコンが並ぶので、光らせる効果の名前を部品ごとに分ける
function useGlowId(): string {
	return `glow-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
}

function GlowFilter({ id }: { id: string }) {
	return (
		<defs>
			<filter id={id} x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="0.05" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>
	);
}

// 向きを、右（east）を0度とした時計回りの角度に直す表（SVGはyが下向き）
const ROBOT_ANGLES: Readonly<Record<Direction, number>> = {
	east: 0,
	south: 90,
	west: 180,
	north: 270,
};

// ロボットの位置と向き。マスの印と見分けがつくよう、白い縁のオレンジの丸に、向きを示す三角を載せる
function RobotMark({ robot }: { robot: MapRobot }) {
	return (
		<g
			transform={`translate(${robot.x} ${robot.y}) rotate(${ROBOT_ANGLES[robot.direction]} 0.5 0.5)`}
		>
			<circle
				cx={0.5}
				cy={0.5}
				r={0.34}
				fill={COLORS.robot}
				stroke={COLORS.robotEdge}
				strokeWidth={0.08}
			/>
			<path d="M0.74 0.5 L0.4 0.3 L0.4 0.7 Z" fill={COLORS.robotEdge} />
		</g>
	);
}

type MapCellProps = { cell: Cell; startDirection: Direction; glow: string };

function MapCell({ cell, startDirection, glow }: MapCellProps) {
	if (cell === "wall") return <rect width={1} height={1} fill={COLORS.wall} />;

	return (
		<>
			<FloorTile />
			<CellMark cell={cell} startDirection={startDirection} glow={glow} />
		</>
	);
}

// グレーの正方形（ひび割れたコンクリート）。枠線でマス目が分かるようにする
function FloorTile() {
	return (
		<>
			<rect width={1} height={1} fill={COLORS.floor} stroke={COLORS.grid} strokeWidth={0.04} />
			<path
				d="M0.18 0.24 L0.36 0.4 L0.46 0.38 L0.62 0.6 M0.46 0.38 L0.52 0.26 M0.72 0.76 L0.82 0.86"
				fill="none"
				stroke={COLORS.crack}
				strokeWidth={0.025}
				strokeLinecap="round"
			/>
		</>
	);
}

function CellMark({ cell, startDirection, glow }: MapCellProps) {
	switch (cell) {
		case "hole":
			// 黒い丸の外側に、オレンジに光る輪
			return (
				<>
					<circle cx={0.5} cy={0.5} r={0.3} fill={COLORS.hole} />
					<circle
						cx={0.5}
						cy={0.5}
						r={0.36}
						fill="none"
						stroke={COLORS.holeRing}
						strokeWidth={0.07}
						filter={glow}
					/>
				</>
			);
		case "start": {
			const Chevron = START_CHEVRONS[startDirection];
			return (
				<Chevron
					x={ICON_INSET}
					y={ICON_INSET}
					size={ICON_SIZE}
					color={COLORS.start}
					strokeWidth={3.5}
				/>
			);
		}
		case "goal":
			return (
				<Flag
					x={ICON_INSET}
					y={ICON_INSET}
					size={ICON_SIZE}
					color={COLORS.goal}
					strokeWidth={2.5}
				/>
			);
		case "key":
			return (
				<Key x={ICON_INSET} y={ICON_INSET} size={ICON_SIZE} color={COLORS.key} strokeWidth={2.5} />
			);
		case "teleportUp":
			return <TeleportArrow color={COLORS.teleportUp} up glow={glow} />;
		case "teleportDown":
			return <TeleportArrow color={COLORS.teleportDown} up={false} glow={glow} />;
		case "floor":
		case "wall":
			return null;
	}
}

type TeleportArrowProps = { color: string; up: boolean; glow: string };

// 棒が幅のある長方形の矢印。弱く光らせる
function TeleportArrow({ color, up, glow }: TeleportArrowProps) {
	return (
		<path
			d="M0.42 0.85 L0.58 0.85 L0.58 0.5 L0.78 0.5 L0.5 0.15 L0.22 0.5 L0.42 0.5 Z"
			fill={color}
			filter={glow}
			transform={up ? undefined : "rotate(180 0.5 0.5)"}
		/>
	);
}
