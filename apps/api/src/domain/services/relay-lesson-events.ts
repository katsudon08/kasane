/*
 * 送り先に届いた知らせを、授業が終わるまで流し続ける（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
 * 何も届かなくても、決めた間隔ごとに空の知らせ（ping）を流す
 */
import { isLessonEnded } from "@kasane/core";

import { ENDED, PING } from "../entities/server-event";
import type { EndedEvent, PingEvent } from "../entities/server-event";
import type { Subscription } from "./lesson-hub";

type RelayOptions = {
	// つないだ時点の、授業が終わる時刻
	endsAt: Date;
	// 空の知らせを流す間隔
	pingIntervalMs: number;
	// 今の時刻。授業が終わったかを確かめるのに使う
	now: () => Date;
};

export async function* relayLessonEvents<Event extends { readonly event: string }>(
	subscription: Subscription<Event>,
	{ endsAt, pingIntervalMs, now }: RelayOptions,
): AsyncGenerator<Event | EndedEvent | PingEvent, void, undefined> {
	// 知らせが届き続けていても、空の知らせの間隔は延ばさない
	let nextPingAt = Date.now() + pingIntervalMs;

	for (;;) {
		const event = await subscription.next(Math.max(0, nextPingAt - Date.now()));

		if (event === null) {
			// 空の知らせを流すたびに確かめる（教師が「授業を終える」を押し忘れても、タイマーなしで知らせられる）
			if (isLessonEnded({ endsAt }, now())) {
				yield ENDED;
				return;
			}
			yield PING;
			nextPingAt = Date.now() + pingIntervalMs;
			continue;
		}

		yield event;
		// 終わりを知らせた後は、接続を閉じる
		if (event.event === "ended") return;
	}
}
