/*
 * 迷路を保存する（仕様書backend.mdの「HTTPのAPI」のPOST /me/mazes・PUT /me/mazes/:mazeId）
 * 新しく作るときはPOSTで行を作り、変えるときはPUTで名前と形を丸ごと置き換える
 * 通信できないときは値で返し、もう一度「できあがり」を押してもらう。それ以外の失敗は想定外として投げる
 * 授業を続けられないとき（401・410）は、StudentAccessLostが投げられる
 */
import type { Maze } from "@kasane/core";

import { api, withStudentToken } from "../../../shared/api";

// 保存する先。新しく作るか、どの迷路を変えるか
export type SaveTarget = { kind: "new" } | { kind: "edit"; mazeId: string };

export type SaveResult = { ok: true; mazeId: string } | { ok: false; reason: "offline" };

type Content = { name: string; data: Maze };

// 通信できない（Edenは通信の失敗を503で返す）。サーバーの不調も、もう一度押してもらうしかない
const SERVER_ERROR = 500;

function unexpected(status: number): Error {
	return new Error(`迷路を保存できなかった（${status}）`);
}

async function create(content: Content): Promise<SaveResult> {
	const { data, status } = await withStudentToken((headers) =>
		api.me.mazes.post(content, { headers }),
	);
	if (status >= SERVER_ERROR) return { ok: false, reason: "offline" };
	if (status !== 201 || data === null || !("mazeId" in data)) throw unexpected(status);
	return { ok: true, mazeId: data.mazeId };
}

async function replace(mazeId: string, content: Content): Promise<SaveResult> {
	const { status } = await withStudentToken((headers) =>
		api.me.mazes({ mazeId }).put(content, { headers }),
	);
	if (status >= SERVER_ERROR) return { ok: false, reason: "offline" };
	if (status !== 204) throw unexpected(status);
	return { ok: true, mazeId };
}

export function saveMaze(target: SaveTarget, content: Content): Promise<SaveResult> {
	return target.kind === "new" ? create(content) : replace(target.mazeId, content);
}
