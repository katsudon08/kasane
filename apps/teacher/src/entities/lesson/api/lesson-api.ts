/*
 * 教師用のHTTPのAPI（仕様書backend.mdの「HTTPのAPI」の教師用）
 * 想定外の失敗は投げて、TanStack Queryに渡す
 */
import { queryOptions } from "@tanstack/react-query";

import { api, withTeacherToken } from "../../../shared/api";

async function fetchOpenLessons() {
	const { data, error } = await withTeacherToken((headers) => api.lessons.get({ headers }));
	if (error) throw error;

	return data;
}

// 授業の見出しに使う、授業を始めた時刻。他人の授業・存在しない授業（404）と終わった授業（410）は、どちらも終わった授業として扱う
type LessonDetail = { readonly ended: false; readonly createdAt: Date } | { readonly ended: true };

async function fetchLesson(lessonId: string): Promise<LessonDetail> {
	const { data, error } = await withTeacherToken((headers) =>
		api.lessons({ lessonId }).get({ headers }),
	);
	if (error?.status === 404 || error?.status === 410) return { ended: true };
	if (error) throw error;

	return { ended: false, createdAt: new Date(data.createdAt) };
}

export const lessonQueries = {
	// 開いている授業（新しい順）。再読み込みしても、保存した教師のトークンで同じ一覧が返る
	open: () => queryOptions({ queryKey: ["lessons", "open"], queryFn: fetchOpenLessons }),
	// 授業を始めた時刻は変わらず、終わった授業が開き直すこともないので、取り直さない
	detail: (lessonId: string) =>
		queryOptions({
			queryKey: ["lessons", "detail", lessonId],
			queryFn: () => fetchLesson(lessonId),
			staleTime: Infinity,
		}),
};

// 授業を作り、授業のIDを返す
export async function createLesson(): Promise<string> {
	const { data, error } = await withTeacherToken((headers) =>
		api.lessons.post(undefined, { headers }),
	);
	if (error) throw error;

	return data.lessonId;
}

/*
 * 授業を終える。もう終わっていた（410）・見つからない（404）ときも、終えたときと同じくホームへ戻ればよいので失敗にしない
 * 終えた授業は、次に取り直した開いている授業の一覧に入らない
 */
export async function closeLesson(lessonId: string): Promise<void> {
	const { error } = await withTeacherToken((headers) =>
		api.lessons({ lessonId }).close.post(undefined, { headers }),
	);
	if (error?.status === 404 || error?.status === 410) return;
	if (error) throw error;
}
