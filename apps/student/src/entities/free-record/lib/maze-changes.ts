/*
 * 自由モードの自分の迷路を変える（仕様書free-mode.mdの「記録」）
 * 足す・置き換える・除くは元の一覧を書き換えず、updatedAtが新しい順に並べた新しい一覧を返す
 * 保存する前に、名前は迷路の名前の決まりで、dataはvalidateMazeで確かめ、通らなければ理由を返す
 */
import { validateMaze } from "@kasane/core";
import type { Maze } from "@kasane/core";

import { nameOf } from "../../../shared/lib/name";
import { sortMazes } from "./stored-mazes";
import type { FreeMaze } from "./stored-mazes";

export type MazeContent = { name: string; data: Maze };

export type MazeChange =
	| { ok: true; mazes: FreeMaze[] }
	| { ok: false; reason: "invalidName" | "invalidMaze" | "notFound" };

type Checked = { ok: true; name: string } | { ok: false; reason: "invalidName" | "invalidMaze" };

// 名前は前後の空白を削った形で返す
function check({ name, data }: MazeContent): Checked {
	const trimmed = nameOf(name);
	if (trimmed === null) return { ok: false, reason: "invalidName" };
	if (!validateMaze(data).ok) return { ok: false, reason: "invalidMaze" };
	return { ok: true, name: trimmed };
}

// nowは末尾がZのISO 8601の文字列。mazeIdは呼び出し側で作る（UUID）
export function addMaze(
	mazes: readonly FreeMaze[],
	content: MazeContent,
	{ mazeId, now }: { mazeId: string; now: string },
): MazeChange {
	const checked = check(content);
	if (!checked.ok) return checked;

	const added: FreeMaze = {
		mazeId,
		name: checked.name,
		data: content.data,
		createdAt: now,
		updatedAt: now,
	};
	return { ok: true, mazes: sortMazes([...mazes, added]) };
}

export function replaceMaze(
	mazes: readonly FreeMaze[],
	mazeId: string,
	content: MazeContent,
	now: string,
): MazeChange {
	if (!mazes.some((maze) => maze.mazeId === mazeId)) return { ok: false, reason: "notFound" };
	const checked = check(content);
	if (!checked.ok) return checked;

	const replaced = mazes.map((maze) =>
		maze.mazeId === mazeId
			? { ...maze, name: checked.name, data: content.data, updatedAt: now }
			: maze,
	);
	return { ok: true, mazes: sortMazes(replaced) };
}

// ない迷路を消しても、一覧は変わらない
export function removeMaze(mazes: readonly FreeMaze[], mazeId: string): FreeMaze[] {
	return mazes.filter((maze) => maze.mazeId !== mazeId);
}
