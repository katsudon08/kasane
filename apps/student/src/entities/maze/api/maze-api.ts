/*
 * 自分の迷路の一覧（仕様書backend.mdの「HTTPのAPI」のGET /me/mazes）
 * 書き換えるのは本人だけなので取り直さず、保存・変更したときに無効化する（backend.mdの「フロントエンド共通」）
 * キーはGET /meの["me"]と分ける（チュートリアルに挑戦したときの["me"]の無効化に巻き込まない）
 */
import { queryOptions } from "@tanstack/react-query";

import { api, withStudentToken } from "../../../shared/api";

async function fetchMazes() {
	const { data, error } = await withStudentToken((headers) => api.me.mazes.get({ headers }));
	if (error) throw error;

	return data;
}

export const mazeQueries = {
	// updatedAtが新しい順（サーバーが並べて返す）
	list: () => queryOptions({ queryKey: ["mazes"], queryFn: fetchMazes, staleTime: Infinity }),
};
