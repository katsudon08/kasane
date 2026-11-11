/*
 * 教師用のSSE（GET /lessons/:lessonId/events）につなぎ、切れたらつなぎ直す
 * （仕様書backend.mdの「サーバーからの知らせ（SSE）」「再接続」）
 */
import { api, withTeacherToken } from "../../../shared/api";
import {
	canReconnectNow,
	reconnectDelayMs,
	sleep,
	waitUntilReconnectable,
} from "../../../shared/lib/reconnect";
import type { LessonEvent } from "./types";

// 空の知らせは10秒未満ごとに届くはずなので、その2倍なにも届かなければ切れたとみなす
const SILENCE_TIMEOUT_MS = 20_000;

// これより長くつながらないときだけ、画面に知らせる
const DISCONNECTED_NOTICE_MS = 5000;

type Handlers = {
	onEvent: (event: LessonEvent) => void;
	// 授業が終わっている（つなぐときの404・410、またはendedが届いた）。この後はつなぎ直さない
	onEnded: () => void;
	// 5秒以上つながっていないか
	onDisconnectedLongChange: (disconnectedLong: boolean) => void;
};

type ConnectResult = "ended" | "disconnected";

async function connectOnce(
	lessonId: string,
	signal: AbortSignal,
	onOpen: () => void,
	onEvent: (event: LessonEvent) => void,
): Promise<ConnectResult> {
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
		const { data, status } = await withTeacherToken((headers) =>
			api.lessons({ lessonId }).events.get({ headers, fetch: { signal: attempt.signal } }),
		);
		/*
		 * 他人の授業・存在しない授業（404）、終わった授業（410）、授業のIDの形が正しくない（422）は、つないでも始まらない
		 * 発行し直したトークンでも断られた（401）ときも止める。つなぎ直すたびに教師を作り直さないため
		 */
		if (status === 401 || status === 404 || status === 410 || status === 422) return "ended";
		if (data === null) return "disconnected";

		onOpen();
		heard();
		for await (const event of data) {
			heard();
			if (event.event === "ended") return "ended";
			onEvent(event);
		}
		return "disconnected";
	} catch {
		// 受け取っている途中で切れた（通信の失敗・なにも届かない・画面を離れた）
		return "disconnected";
	} finally {
		clearTimeout(silence);
		signal.removeEventListener("abort", abort);
		attempt.abort();
	}
}

// signalが中断されるか、授業が終わるまで、つなぎ直し続ける
export async function watchLesson(
	lessonId: string,
	signal: AbortSignal,
	{ onEvent, onEnded, onDisconnectedLongChange }: Handlers,
): Promise<void> {
	let notice: ReturnType<typeof setTimeout> | undefined;
	const disconnected = () => {
		notice ??= setTimeout(() => onDisconnectedLongChange(true), DISCONNECTED_NOTICE_MS);
	};
	const connected = () => {
		clearTimeout(notice);
		notice = undefined;
		onDisconnectedLongChange(false);
	};

	try {
		disconnected();
		await waitUntilReconnectable(signal);
		while (!signal.aborted) {
			const result = await connectOnce(lessonId, signal, connected, onEvent);
			if (signal.aborted) return;
			if (result === "ended") {
				onEnded();
				return;
			}

			disconnected();
			// 見えていない・オフラインのときは、見えた・つながった瞬間につなぎ直すので、間隔を空けない
			if (canReconnectNow()) await sleep(reconnectDelayMs(Math.random()), signal);
			await waitUntilReconnectable(signal);
		}
	} finally {
		clearTimeout(notice);
	}
}
