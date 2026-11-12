/*
 * 児童本人の名前とクリア数（仕様書backend.mdの「HTTPのAPI」のGET /me）
 * クリア数が変わるのはチュートリアルに挑戦したときだけなので、取り直さない（backend.mdの「フロントエンド共通」）
 * 想定外の失敗は投げて、TanStack Queryに渡す。401・410はStudentAccessLostになる
 */
import { queryOptions } from "@tanstack/react-query";

import { api, withStudentToken } from "../../../shared/api";

async function fetchMe() {
	const { data, error } = await withStudentToken((headers) => api.me.get({ headers }));
	if (error) throw error;

	return data;
}

export const meQueries = {
	me: () => queryOptions({ queryKey: ["me"], queryFn: fetchMe, staleTime: Infinity }),
};
