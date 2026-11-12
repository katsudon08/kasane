/*
 * カードの並び（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」）
 * - 木構造をそのまま表示する。くりかえしの中の命令は字下げし、エディタのインデントの線のような縦線を引く
 * - 左端に番号（木を上から数えた順）、右端にゴミ箱。くりかえしは回数のボタンと開閉ボタン
 * - 開いているくりかえしの中の命令の下に、「くりかえし終わり」の行を出す
 * - カードを押すと、そのカードの直後が差し込み位置になる。差し込み位置は太い青の線と「ここに入る」の印で示す
 * - 動かしている間の今のカードは枠と色とアイコンで示す（止まったカードは赤）
 * - 読み取ったカードは、差し込み位置に飛び込む動きで入る
 */
import type { Command, Program } from "@kasane/core";
import { ActionIcon, UnstyledButton } from "@mantine/core";
import { ArrowRight, ChevronDown, ChevronRight, CircleX, Play, Trash2 } from "lucide-react";
import { memo, useEffect, useMemo, useRef } from "react";

import type { Cursor } from "../lib/program-edit";
import { programRows } from "../lib/program-rows";
import type { ProgramRow } from "../lib/program-rows";
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

function rowKey(row: ProgramRow): string {
	if (row.kind === "card") return commandKey(row.command);
	if (row.kind === "end") return `end-${row.path.join(".")}`;
	return "head";
}

// 差し込み位置の線を引く深さ。開いているくりかえしのカードの下は、その中なので一段深い
function lineDepth(row: ProgramRow): number {
	return row.kind === "card" && row.open ? row.depth + 1 : row.depth;
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
		<div ref={list} className={classes.list}>
			{rows.map((row) => {
				const lined = editable && samePath(row.cursor, cursor);
				return (
					<div key={rowKey(row)}>
						{row.kind === "card" && (
							<CardRow
								command={row.command}
								path={row.path}
								number={row.number}
								depth={row.depth}
								open={row.open}
								cursor={row.cursor}
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
						)}
						{row.kind === "end" && (
							<EndRow
								depth={row.depth}
								cursor={row.cursor}
								editable={editable}
								onCursor={onCursor}
							/>
						)}
						{lined && <InsertLine depth={lineDepth(row)} />}
					</div>
				);
			})}
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

// 差し込み位置。太い青の線と「ここに入る」の印
function InsertLine({ depth }: { depth: number }) {
	return (
		<div className={classes.lineRow} data-focus="true">
			<Guides depth={depth} />
			<div className={classes.line}>
				<span className={classes.lineLabel}>
					<ArrowRight aria-hidden size={24} strokeWidth={3} />
					ここに
					<ruby>
						入<rt>はい</rt>
					</ruby>
					る
				</span>
			</div>
		</div>
	);
}

type CardRowProps = {
	command: Command;
	path: number[];
	number: number;
	depth: number;
	open: boolean;
	cursor: Cursor;
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
		samePath(before.cursor, after.cursor) &&
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
	cursor,
	highlight,
	arrived,
	editable,
	onCursor,
	onRemove,
	onToggle,
	onTimes,
}: CardRowProps) {
	return (
		<div className={classes.row}>
			<Guides depth={depth} />
			<div
				className={classes.card}
				data-type={command.type}
				data-highlight={highlight}
				data-arrived={arrived}
				data-focus={highlight !== "none"}
			>
				{/* カードを押すと、その直後（開いているくりかえしはその中の先頭）が差し込み位置になる */}
				<UnstyledButton
					className={classes.body}
					onClick={() => onCursor(cursor)}
					disabled={!editable}
					aria-label={`${number}まい目のカードの後ろに入れる`}
				>
					<span className={classes.number}>{number}</span>
					{highlight === "current" && <Play aria-hidden size={24} className={classes.mark} />}
					{highlight === "failed" && <CircleX aria-hidden size={24} className={classes.mark} />}
					<CardIcon type={command.type} />
					<span className={classes.name}>
						<CardName type={command.type} />
					</span>
				</UnstyledButton>
				{command.type === "repeat" && (
					<>
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
						<ActionIcon
							variant="subtle"
							color="dark"
							onClick={() => onToggle(path)}
							disabled={!editable}
							aria-expanded={open}
							aria-label={open ? "くりかえしの中を閉じる" : "くりかえしの中を開く"}
						>
							{open ? (
								<ChevronDown aria-hidden size={32} />
							) : (
								<ChevronRight aria-hidden size={32} />
							)}
						</ActionIcon>
					</>
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
		</div>
	);
}, sameRow);

type EndRowProps = {
	depth: number;
	cursor: Cursor;
	editable: boolean;
	onCursor: (cursor: Cursor) => void;
};

// 開いているくりかえしの「くりかえし終わり」。押すと、くりかえしの直後が差し込み位置になる
const EndRow = memo(function EndRow({ depth, cursor, editable, onCursor }: EndRowProps) {
	return (
		<div className={classes.row}>
			<Guides depth={depth} />
			<div className={classes.card} data-type="end">
				<UnstyledButton
					className={classes.body}
					onClick={() => onCursor(cursor)}
					disabled={!editable}
					aria-label="くりかえしの後ろに入れる"
				>
					<span className={classes.number} />
					<CardIcon type="end" />
					<span className={classes.name}>
						<CardName type="end" />
					</span>
				</UnstyledButton>
			</div>
		</div>
	);
});
