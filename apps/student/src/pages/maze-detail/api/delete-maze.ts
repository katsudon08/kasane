/*
 * 自分の迷路を消す（仕様書backend.mdの「HTTPのAPI」のDELETE /me/mazes/:mazeId）
 * もう消えていた（404。別のタブで消したなど）ときも、消したときと同じくホームへ移る
 * 通信できないときは値で返し、もう一度押してもらう。それ以外の失敗は想定外として投げる
 * 授業を続けられないとき（401・410）は、StudentAccessLostが投げられる
 */
import { api, withStudentToken } from "../../../shared/api";

export type DeleteResult = { ok: true } | { ok: false; reason: "offline" };

// 通信できない（Edenは通信の失敗を503で返す）
const SERVER_ERROR = 500;

export async function deleteMaze(mazeId: string): Promise<DeleteResult> {
	const { status } = await withStudentToken((headers) =>
		api.me.mazes({ mazeId }).delete(undefined, { headers }),
	);
	if (status === 204 || status === 404) return { ok: true };
	if (status >= SERVER_ERROR) return { ok: false, reason: "offline" };
	throw new Error(`迷路を消せなかった（${status}）`);
}
