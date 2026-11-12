/*
 * カードの並び（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」）
 * - 木構造をそのまま表示する。くりかえしの中の命令は字下げし、エディタのインデントの線のような縦線を引く
 * - カードの形はジグソーパズルのピース（上がへこみ、下が出っ張り）。出っ張りが「ここに入れる」ボタン
 * - 左端に番号（木を上から数えた順）、右端にゴミ箱。くりかえしは回数のボタンと、押すと開閉する名前
 * - 差し込み位置は枠と色で、動かしている間の今のカードは枠と色とアイコンで示す（止まったカードは赤）
 * - 読み取ったカードは、差し込み位置に飛び込む動きで入る
 */
import type { Command, Program } from "@kasane/core";
import { ActionIcon, UnstyledButton } from "@mantine/core";
import { ChevronDown, ChevronRight, CircleX, Play, Plus, Trash2 } from "lucide-react";
import { memo, useEffect, useMemo, useRef } from "react";

import type { Cursor } from "../lib/program-edit";
import { programRows } from "../lib/program-rows";
import { CardIcon, CardName } from "./CardLabel";

import classes from "./CardList.module.css";

export type CurrentCard = { path: number[]; failed: boolean };

type Props = {
	program: Program;
	cursor: Cursor;
	collapsed: ReadonlySet<Command>;
	current: CurrentCard | null;
	// 最後に入れたカード（飛び込む動き）
	arrived: Command | null;
	// 「つくる」の間だけ並びを変えられる
	editable: boolean;
	onCursor: (cursor: Cursor) => void;
	onRemove: (path: number[]) => void;
	onToggle: (path: number[]) => void;
	onTimes: (path: number[]) => void;
};

function samePath(a: readonly number[] | null, b: readonly number[] | null): boolean {
	if (a === null || b === null) return a === b;
	return a.length === b.length && a.every((index, level) => b[level] === index);
}

// 行のkey。命令はオブジェクトで見分ける（変えていない命令は、編集の後も同じオブジェクトのまま）
const commandIds = new WeakMap<Command, number>();
let nextCommandId = 0;
function commandKey(command: Command): string {
	let id = commandIds.get(command);
	if (id === undefined) {
		nextCommandId += 1;
		id = nextCommandId;
		commandIds.set(command, id);
	}
	return `card-${id}`;
}

export function CardList({
	program,
	cursor,
	collapsed,
	current,
	arrived,
	editable,
	onCursor,
	onRemove,
	onToggle,
	onTimes,
}: Props) {
	const currentPath = current?.path ?? null;
	const rows = useMemo(
		() => programRows(program, { collapsed, cursor, current: currentPath }),
		[program, collapsed, cursor, currentPath],
	);

	// 差し込み位置か今のカードが見えるように、並びを送る
	const list = useRef<HTMLDivElement>(null);
	const focusKey = editable ? `cursor-${cursor.join(".")}` : `current-${currentPath?.join(".")}`;
	useEffect(() => {
		list.current
			?.querySelector('[data-focus="true"]')
			?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}, [focusKey]);

	return (
		<div ref={list} className={classes.list} aria-label="カードの並び">
			{rows.map((row) =>
				row.kind === "card" ? (
					<CardRow
						key={commandKey(row.command)}
						command={row.command}
						path={row.path}
						number={row.number}
						depth={row.depth}
						open={row.open}
						slot={row.slot}
						slotActive={editable && row.slot !== null && samePath(row.slot, cursor)}
						highlight={
							current !== null && samePath(current.path, row.path)
								? current.failed
									? "failed"
									: "current"
								: "none"
						}
						arrived={row.command === arrived}
						editable={editable}
						onCursor={onCursor}
						onRemove={onRemove}
						onToggle={onToggle}
						onTimes={onTimes}
					/>
				) : (
					<SlotRow
						key={`slot-${row.cursor.join(".")}`}
						cursor={row.cursor}
						depth={row.depth}
						active={editable && samePath(row.cursor, cursor)}
						editable={editable}
						onCursor={onCursor}
					/>
				),
			)}
		</div>
	);
}

// 字下げの縦線
function Guides({ depth }: { depth: number }) {
	return Array.from({ length: depth }, (_, level) => (
		// 縦線は並びが変わらないので、深さをkeyにする
		<span key={level} className={classes.guide} aria-hidden />
	));
}

type BumpProps = {
	cursor: Cursor;
	active: boolean;
	editable: boolean;
	onCursor: (cursor: Cursor) => void;
};

// 下の出っ張り。押すとそこが差し込み位置になる
function Bump({ cursor, active, editable, onCursor }: BumpProps) {
	return (
		<button
			type="button"
			className={classes.bump}
			data-active={active}
			data-focus={active}
			aria-label="ここに入れる"
			aria-pressed={active}
			disabled={!editable}
			onClick={() => onCursor(cursor)}
		>
			<Plus aria-hidden size={20} strokeWidth={3} />
		</button>
	);
}

type CardRowProps = {
	command: Command;
	path: number[];
	number: number;
	depth: number;
	open: boolean;
	slot: Cursor | null;
	slotActive: boolean;
	highlight: "none" | "current" | "failed";
	arrived: boolean;
	editable: boolean;
	onCursor: (cursor: Cursor) => void;
	onRemove: (path: number[]) => void;
	onToggle: (path: number[]) => void;
	onTimes: (path: number[]) => void;
};

// 位置の配列は行を作るたびに新しくなるので、中身で比べる（変わっていないカードは描き直さない）
function sameRow(before: CardRowProps, after: CardRowProps): boolean {
	return (
		before.command === after.command &&
		samePath(before.path, after.path) &&
		before.number === after.number &&
		before.depth === after.depth &&
		before.open === after.open &&
		samePath(before.slot, after.slot) &&
		before.slotActive === after.slotActive &&
		before.highlight === after.highlight &&
		before.arrived === after.arrived &&
		before.editable === after.editable &&
		before.onCursor === after.onCursor &&
		before.onRemove === after.onRemove &&
		before.onToggle === after.onToggle &&
		before.onTimes === after.onTimes
	);
}

const CardRow = memo(function CardRow({
	command,
	path,
	number,
	depth,
	open,
	slot,
	slotActive,
	highlight,
	arrived,
	editable,
	onCursor,
	onRemove,
	onToggle,
	onTimes,
}: CardRowProps) {
	const Chevron = open ? ChevronDown : ChevronRight;

	return (
		<div className={classes.row}>
			<Guides depth={depth} />
			<div className={classes.piece}>
				<div
					className={classes.card}
					data-type={command.type}
					data-highlight={highlight}
					data-arrived={arrived}
					data-focus={highlight !== "none"}
				>
					<span className={classes.number}>{number}</span>
					{highlight === "current" && <Play aria-hidden size={24} className={classes.mark} />}
					{highlight === "failed" && <CircleX aria-hidden size={24} className={classes.mark} />}
					{command.type === "repeat" ? (
						<>
							<UnstyledButton
								className={classes.name}
								onClick={() => onToggle(path)}
								disabled={!editable}
								aria-expanded={open}
							>
								<CardIcon type="repeat" />
								<span>
									<CardName type="repeat" />
								</span>
								<Chevron aria-hidden size={24} />
							</UnstyledButton>
							<UnstyledButton
								className={classes.times}
								onClick={() => onTimes(path)}
								disabled={!editable}
								aria-label={`くりかえす回数（${command.times}回）を変える`}
							>
								{command.times}
								<ruby>
									回<rt>かい</rt>
								</ruby>
							</UnstyledButton>
						</>
					) : (
						<span className={classes.name}>
							<CardIcon type={command.type} />
							<span>
								<CardName type={command.type} />
							</span>
						</span>
					)}
					<ActionIcon
						variant="subtle"
						color="gray"
						onClick={() => onRemove(path)}
						disabled={!editable}
						aria-label={`${number}まい目のカードを消す`}
					>
						<Trash2 aria-hidden size={28} />
					</ActionIcon>
				</div>
				{slot !== null && (
					<Bump cursor={slot} active={slotActive} editable={editable} onCursor={onCursor} />
				)}
			</div>
		</div>
	);
}, sameRow);

type SlotRowProps = {
	cursor: Cursor;
	depth: number;
	active: boolean;
	editable: boolean;
	onCursor: (cursor: Cursor) => void;
};

/*
 * カードに付かない出っ張り
 * - 中が空のくりかえし・空の並び・先頭: そこに入れる場所
 * - 開いたくりかえしのbodyの下: くりかえしの直後（くりかえしの終わりの縁に付ける）
 */
const SlotRow = memo(function SlotRow({ cursor, depth, active, editable, onCursor }: SlotRowProps) {
	const blockEnd = cursor.at(-1) !== 0;
	return (
		<div className={classes.row}>
			<Guides depth={depth} />
			<div className={classes.piece}>
				<div className={blockEnd ? classes.blockEnd : classes.space} />
				<Bump cursor={cursor} active={active} editable={editable} onCursor={onCursor} />
			</div>
		</div>
	);
});
