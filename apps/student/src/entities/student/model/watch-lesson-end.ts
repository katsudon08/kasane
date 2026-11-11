/*
 * 児童用のSSE（GET /me/events）につなぎ、授業の終わりを待つ。切れたらつなぎ直す
 * （仕様書backend.mdの「サーバーからの知らせ（SSE）」「再接続」、README.mdの「画面遷移」の児童）
 * 児童の画面には、切れていることを何も出さない（受け取るのはendedだけで、プログラムの送信は切れていても使える）
 */
import {
	canReconnectNow,
	reconnectDelayMs,
	sleep,
	waitUntilReconnectable,
} from "@kasane/lib-client";

import { StudentAccessLost, api, withStudentToken } from "../../../shared/api";
import type { StudentAccessLostReason } from "../../../shared/api";

// 空の知らせは10秒未満ごとに届くはずなので、その2倍なにも届かなければ切れたとみなす
const SILENCE_TIMEOUT_MS = 20_000;

type ConnectResult = StudentAccessLostReason | "disconnected";

async function connectOnce(signal: AbortSignal): Promise<ConnectResult> {
	// この1回の接続だけを切るためのもの。画面を離れたとき（signal）と、なにも届かないときに切る
	const attempt = new AbortController();
	const abort = () => attempt.abort();
	signal.addEventListener("abort", abort, { once: true });
	let silence = setTimeout(abort, SILENCE_TIMEOUT_MS);
	const heard = () => {
		clearTimeout(silence);
		silence = setTimeout(abort, SILENCE_TIMEOUT_MS);
	};

	try {
		// 本人を特定できない（401）・授業が終わっている（410）ときは、つないでも始まらない（StudentAccessLostが投げられる）
		const { data } = await withStudentToken((headers) =>
			api.me.events.get({ headers, fetch: { signal: attempt.signal } }),
		);
		if (data === null) return "disconnected";

		heard();
		for await (const event of data) {
			heard();
			if (event.event === "ended") return "lessonEnded";
		}
		return "disconnected";
	} catch (error) {
		if (error instanceof StudentAccessLost) return error.reason;
		// 受け取っている途中で切れた（通信の失敗・なにも届かない・画面を離れた）
		return "disconnected";
	} finally {
		clearTimeout(silence);
		signal.removeEventListener("abort", abort);
		attempt.abort();
	}
}

// signalが中断されるか、授業を続けられなくなるまで、つなぎ直し続ける
export async function watchLessonEnd(
	signal: AbortSignal,
	onLost: (reason: StudentAccessLostReason) => void,
): Promise<void> {
	await waitUntilReconnectable(signal);
	while (!signal.aborted) {
		const result = await connectOnce(signal);
		if (signal.aborted) return;
		if (result !== "disconnected") {
			onLost(result);
			return;
		}

		// 見えていない・オフラインのときは、見えた・つながった瞬間につなぎ直すので、間隔を空けない
		if (canReconnectNow()) await sleep(reconnectDelayMs(Math.random()), signal);
		await waitUntilReconnectable(signal);
	}
}
