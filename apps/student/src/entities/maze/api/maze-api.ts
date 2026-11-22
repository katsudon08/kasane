/*
 * 自分の迷路の一覧（仕様書backend.mdの「HTTPのAPI」のGET /me/mazes、free-mode.mdの「記録」）
 * - 授業で使うモードはGET /me/mazesから、自由モードはlocalStorageから読む。どちらもupdatedAtが新しい順
 * - 書き換えるのは本人だけなので取り直さず、保存・変更したときに無効化する（backend.mdの「フロントエンド共通」）
 * キーはGET /meの["me"]と分ける（チュートリアルに挑戦したときの["me"]の無効化に巻き込まない）
 */
import type { Maze } from "@kasane/core";
import { queryOptions } from "@tanstack/react-query";

import { api, withStudentToken } from "../../../shared/api";
import { networkModeOf } from "../../../shared/lib/student-mode";
import type { StudentMode } from "../../../shared/lib/student-mode";
import { loadMazes } from "../../free-record/@x/maze";

// 一覧の一つ。GET /me/mazesの要素と同じ形
export type MazeSummary = { mazeId: string; name: string; data: Maze; updatedAt: string };

async function fetchMazes(): Promise<MazeSummary[]> {
	const { data, error } = await withStudentToken((headers) => api.me.mazes.get({ headers }));
	if (error) throw error;

	return data;
}

export const mazeQueries = {
	list: (mode: StudentMode) =>
		queryOptions({
			queryKey: mode === "free" ? ["free", "mazes"] : ["mazes"],
			queryFn: mode === "free" ? loadMazes : fetchMazes,
			staleTime: Infinity,
			networkMode: networkModeOf(mode),
			// 自由モードは通信しないので試し直さず、読めなければうまく動かなかったときの受け止めに任せる
			...(mode === "free" ? { retry: false, throwOnError: true } : {}),
		}),
};
