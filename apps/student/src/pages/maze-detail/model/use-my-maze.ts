/*
 * URLのmazeIdから、自分の迷路を読む（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」の迷路の読み方）
 * しょうさいとプレイの両方で使う
 * - GET /me/mazesのキャッシュからmazeIdで探す（キャッシュがなければ一覧を取ってから探し、見つからなければホームへ移る）
 * - 一覧はチュートリアルを全部クリアするまで取りに行かないので、それまではホームへ移る
 */
import { canCreateMaze } from "@kasane/core";
import type { Maze } from "@kasane/core";
import { useQuery } from "@tanstack/react-query";

import { mazeQueries } from "../../../entities/maze";
import { meQueries } from "../../../entities/student";
import { StudentAccessLost } from "../../../shared/api";

export type MyMaze = { mazeId: string; name: string; data: Maze };

export type MyMazeAccess =
	| { kind: "home" }
	// 読み込み中・授業を続けられない（/joinか/endedへ移る）ので何も出さない
	| { kind: "hidden" }
	| { kind: "offline"; retry: () => void }
	| { kind: "ready"; maze: MyMaze };

export function useMyMaze(mazeId: string): MyMazeAccess {
	const me = useQuery(meQueries.me());
	const unlocked = me.data !== undefined && canCreateMaze(me.data.clearedCount);
	const mazes = useQuery({ ...mazeQueries.list(), enabled: unlocked });

	if (me.error instanceof StudentAccessLost) return { kind: "hidden" };
	// 取り直しに失敗しても、前に読んだデータがあればそれで続ける
	if (me.data === undefined) {
		return me.isError ? { kind: "offline", retry: () => void me.refetch() } : { kind: "hidden" };
	}
	if (!unlocked) return { kind: "home" };
	if (mazes.error instanceof StudentAccessLost) return { kind: "hidden" };
	if (mazes.data === undefined) {
		return mazes.isError
			? { kind: "offline", retry: () => void mazes.refetch() }
			: { kind: "hidden" };
	}

	const maze = mazes.data.find((candidate) => candidate.mazeId === mazeId);
	if (maze === undefined) return { kind: "home" };
	return { kind: "ready", maze };
}
