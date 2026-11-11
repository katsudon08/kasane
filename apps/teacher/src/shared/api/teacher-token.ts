/*
 * 教師のトークン（仕様書backend.mdの「トークン」、HTTPのAPIのPOST /teachers）
 * ログインはなく、最初の訪問時に発行してlocalStorageに保存する。そのトークンで作った授業だけを見られる
 * 401を受けたら保存したトークンを消して発行し直し、画面には何も出さない（教師にはトークンという概念がないため）
 */
import { api } from "./client";

const STORAGE_KEY = "kasane.teacherToken";

// 発行中の要求。初めて開いた画面で複数の要求が同時にトークンを求めても、教師を一人だけ作る
let issuing: Promise<string> | undefined;

async function issueTeacherToken(): Promise<string> {
	const { data, error } = await api.teachers.post();
	if (error) throw error;

	localStorage.setItem(STORAGE_KEY, data.token);
	return data.token;
}

function teacherToken(): Promise<string> {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored !== null) return Promise.resolve(stored);

	issuing ??= issueTeacherToken().finally(() => {
		issuing = undefined;
	});
	return issuing;
}

// 断られたトークンだけを消す。同時に断られた別の要求が、発行し直したばかりのトークンを消さないようにする
function forgetTeacherToken(token: string): void {
	if (localStorage.getItem(STORAGE_KEY) === token) localStorage.removeItem(STORAGE_KEY);
}

export type AuthHeaders = { authorization: string };

const bearer = (token: string): AuthHeaders => ({ authorization: `Bearer ${token}` });

/*
 * 教師のトークンを付けてAPIを呼ぶ。401なら一度だけ、発行し直したトークンで呼び直す
 * 呼び直した後の応答は、401でもそのまま返す（何度も発行し直さない）
 */
export async function withTeacherToken<Result extends { status: number }>(
	call: (headers: AuthHeaders) => Promise<Result>,
): Promise<Result> {
	const token = await teacherToken();
	const result = await call(bearer(token));
	if (result.status !== 401) return result;

	forgetTeacherToken(token);
	return call(bearer(await teacherToken()));
}
