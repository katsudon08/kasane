/*
 * 児童本人の名前とクリア数（仕様書backend.mdの「HTTPのAPI」のGET /me、free-mode.mdの「記録」）
 * - 授業で使うモードはGET /meから、自由モードはlocalStorageから読む
 * - クリア数が変わるのはチュートリアルに挑戦したときと問題を飛ばしたときだけなので、取り直さない（backend.mdの「フロントエンド共通」）
 * 想定外の失敗は投げて、TanStack Queryに渡す。401・410はStudentAccessLostになる
 */
import { queryOptions } from "@tanstack/react-query";

import { api, withStudentToken } from "../../../shared/api";
import { networkModeOf } from "../../../shared/lib/student-mode";
import type { StudentMode } from "../../../shared/lib/student-mode";
import { loadClearedCount } from "../../free-record/@x/student";

// 自由モードは児童を見分けないので、名前はない（null）
export type Me = { name: string | null; clearedCount: number };

async function fetchMe(): Promise<Me> {
	const { data, error } = await withStudentToken((headers) => api.me.get({ headers }));
	if (error) throw error;

	return data;
}

async function readFreeMe(): Promise<Me> {
	return { name: null, clearedCount: await loadClearedCount() };
}

export const meQueries = {
	me: (mode: StudentMode) =>
		queryOptions({
			queryKey: mode === "free" ? ["free", "me"] : ["me"],
			queryFn: mode === "free" ? readFreeMe : fetchMe,
			staleTime: Infinity,
			networkMode: networkModeOf(mode),
			// 自由モードは通信しないので試し直さず、読めなければうまく動かなかったときの受け止めに任せる
			...(mode === "free" ? { retry: false, throwOnError: true } : {}),
		}),
};
