/*
 * 教師用のHTTPのAPIのうち、授業の作成と一覧（仕様書backend.mdの「HTTPのAPI」の教師用）
 * 失敗は投げて、TanStack Queryに渡す
 */
import { queryOptions } from "@tanstack/react-query";

import { api, withTeacherToken } from "../../../shared/api";

async function fetchOpenLessons() {
	const { data, error } = await withTeacherToken((headers) => api.lessons.get({ headers }));
	if (error) throw error;

	return data;
}

export const lessonQueries = {
	// 開いている授業（新しい順）。再読み込みしても、保存した教師のトークンで同じ一覧が返る
	open: () => queryOptions({ queryKey: ["lessons", "open"], queryFn: fetchOpenLessons }),
};

// 授業を作り、授業のIDを返す
export async function createLesson(): Promise<string> {
	const { data, error } = await withTeacherToken((headers) =>
		api.lessons.post(undefined, { headers }),
	);
	if (error) throw error;

	return data.lessonId;
}
