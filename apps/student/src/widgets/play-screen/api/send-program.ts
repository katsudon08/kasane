/*
 * プログラムを送り、コンパイルの結果を受け取る（仕様書backend.mdの「HTTPのAPI」の
 * POST /me/tutorials/:no/attempts・POST /me/mazes/:mazeId/attempts）
 * 送る前にもう一度は確かめない（カードを入れるたびにvalidateProgramで確かめている。サーバーは必ず確かめる）
 * 通信できないときは値で返し、「つくる」へ戻して文言を出す。それ以外の失敗は想定外として投げる
 * 授業を続けられないとき（401・410）は、StudentAccessLostが投げられる
 */
import type { CompileResult, Program } from "@kasane/core";

import { api, withStudentToken } from "../../../shared/api";
import type { PlayTarget } from "../lib/outcome";

export type SendResult = { ok: true; result: CompileResult } | { ok: false; reason: "offline" };

// 通信できない（Edenは通信の失敗を503で返す）。サーバーの不調も、もう一度押してもらうしかない
const SERVER_ERROR = 500;

/*
 * Edenは再帰する型（くりかえしのbody）を空の配列（never[]）の型に推論するので、送る本文の型だけをそれに合わせる
 * 中身はdomain.mdのProgramそのもので、サーバーがTypeBoxの再帰型で検証する
 */
type SentProgram = Parameters<
	ReturnType<typeof api.me.tutorials>["attempts"]["post"]
>[0]["program"];

function post(target: PlayTarget, program: Program) {
	const body = { program: program as unknown as SentProgram };
	return withStudentToken(async (headers) => {
		const response =
			target.kind === "tutorial"
				? await api.me.tutorials({ no: target.no }).attempts.post(body, { headers })
				: await api.me.mazes({ mazeId: target.mazeId }).attempts.post(body, { headers });
		const { data, status } = response;
		return { data, status };
	});
}

export async function sendProgram(target: PlayTarget, program: Program): Promise<SendResult> {
	const { data, status } = await post(target, program);
	if (data === null) {
		if (status >= SERVER_ERROR) return { ok: false, reason: "offline" };
		throw new Error(`プログラムを送れなかった（${status}）`);
	}
	return { ok: true, result: data };
}
