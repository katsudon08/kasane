/*
 * ユースケースが流す知らせを、SSE（Server-Sent Events）の形にして1件ずつ送る
 * Elysiaは、最初の値がsse()で包まれていれば応答をtext/event-streamにする
 */
import { sse } from "elysia";

export async function* toSse<Event extends { readonly event: string; readonly data: unknown }>(
	events: AsyncGenerator<Event, void, undefined>,
) {
	// sse()は渡した値に項目を足すので、送り先どうしで共有している知らせは写しを渡す
	for await (const event of events) yield sse({ ...event });
}
