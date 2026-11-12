/*
 * 授業に参加する（仕様書backend.mdの「HTTPのAPI」のPOST /students）
 * 参加できたら児童のトークンをlocalStorageに保存する。前の授業のトークンがあれば上書きする
 */
import { api, saveStudentToken } from "../../../shared/api";
import { joinFailureOf } from "../lib/join-failure";
import type { JoinFailure } from "../lib/join-failure";

type JoinInput = { lessonId: string; name: string };

export type JoinResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly failure: JoinFailure };

export async function joinLesson(input: JoinInput): Promise<JoinResult> {
	const { data, error, status } = await api.students.post(input);
	if (error) return { ok: false, failure: joinFailureOf(status) };

	saveStudentToken(data.token);
	return { ok: true };
}
