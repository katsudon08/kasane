/*
 * 児童のトークン（仕様書backend.mdの「トークン」、README.mdの「画面遷移」の児童）
 * 授業に参加したときに受け取り、localStorageに保存する。再読み込みしても同じ児童として続けられる
 * 本人を特定できない（401）ときは、保存したトークンを消して参加し直してもらう
 * 授業が終わっている（410）ときは、どの操作でも「授業がおわりました」へ移る
 */
const STORAGE_KEY = "kasane.studentToken";

export function hasStudentToken(): boolean {
	return localStorage.getItem(STORAGE_KEY) !== null;
}

// 参加し直したときは、前の授業のトークンを上書きする
export function saveStudentToken(token: string): void {
	localStorage.setItem(STORAGE_KEY, token);
}

// 断られたトークンだけを消す。別のタブで参加し直したばかりのトークンを消さないようにする
function forgetStudentToken(token: string): void {
	if (localStorage.getItem(STORAGE_KEY) === token) localStorage.removeItem(STORAGE_KEY);
}

// 授業を続けられない理由。unauthorizedは参加し直し（/join）、lessonEndedは授業がおわりました（/ended）
export type StudentAccessLostReason = "unauthorized" | "lessonEnded";

// 授業を続けられないことを、TanStack Queryと受け取り口の呼び出し元に伝える
export class StudentAccessLost extends Error {
	readonly reason: StudentAccessLostReason;

	constructor(reason: StudentAccessLostReason) {
		super(reason);
		this.name = "StudentAccessLost";
		this.reason = reason;
	}
}

export type AuthHeaders = { authorization: string };

/*
 * 児童のトークンを付けてAPIを呼ぶ
 * トークンがない・断られた（401）・授業が終わっている（410）ときは、StudentAccessLostを投げる
 */
export async function withStudentToken<Result extends { status: number }>(
	call: (headers: AuthHeaders) => Promise<Result>,
): Promise<Result> {
	const token = localStorage.getItem(STORAGE_KEY);
	if (token === null) throw new StudentAccessLost("unauthorized");

	const result = await call({ authorization: `Bearer ${token}` });
	if (result.status === 401) {
		forgetStudentToken(token);
		throw new StudentAccessLost("unauthorized");
	}
	if (result.status === 410) throw new StudentAccessLost("lessonEnded");

	return result;
}
