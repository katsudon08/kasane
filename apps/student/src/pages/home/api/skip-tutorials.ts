/*
 * 問題を飛ばす（仕様書backend.mdの「HTTPのAPI」のPOST /me/tutorials/skip）
 * to問目から始められるよう、1〜to - 1問目をクリアしたことにする
 * 通信できないときは値で返し、もう一度押してもらう。それ以外の失敗は想定外として投げる
 * 授業を続けられないとき（401・410）は、StudentAccessLostが投げられる
 */
import { api, withStudentToken } from "../../../shared/api";

export type SkipResult = { ok: true } | { ok: false; reason: "offline" };

// 通信できない（Edenは通信の失敗を503で返す）。サーバーの不調も、もう一度押してもらうしかない
const SERVER_ERROR = 500;

export async function skipTutorials(to: number): Promise<SkipResult> {
	const { status } = await withStudentToken((headers) =>
		api.me.tutorials.skip.post({ to }, { headers }),
	);
	if (status === 204) return { ok: true };
	if (status >= SERVER_ERROR) return { ok: false, reason: "offline" };
	throw new Error(`問題を飛ばせなかった（${status}）`);
}
