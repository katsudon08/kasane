/*
 * 送り先に届いた知らせを流し続ける処理（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
 * 表の「授業が終わったとき」「10秒未満ごと」の2行と、空の知らせのたびに授業の終わりを確かめる決まりを確かめる
 */
import { describe, expect, it } from "bun:test";

import type { StudentStatus } from "../entities/student-status";
import { createLessonHub } from "./lesson-hub";
import { relayLessonEvents } from "./relay-lesson-events";

const LESSON = "lesson-a";

const STATUS: StudentStatus = {
	studentId: "student-1",
	name: "たろう",
	clearedCount: 0,
	lastResult: "failed",
};
const STUDENT = { event: "student", data: STATUS } as const;
const ENDED = { event: "ended", data: null } as const;
const PING = { event: "ping", data: null } as const;

// テストでは、空の知らせの間隔を短くする
const PING_INTERVAL_MS = 20;

// 授業が終わる時刻と、その前後の時刻
const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");
const BEFORE_END = new Date("2026-11-10T04:59:59.999Z");
const AFTER_END = new Date("2026-11-10T05:00:00.001Z");

// 次の知らせを一つ取り出す。流れが終わっていればnull
const take = async <Event>(events: AsyncGenerator<Event>): Promise<Event | null> => {
	const { done, value } = await events.next();
	return done ? null : value;
};

describe("relayLessonEvents", () => {
	it("届いた知らせを、届いた順にそのまま流す", async () => {
		const hub = createLessonHub();
		const later: StudentStatus = { ...STATUS, clearedCount: 1, lastResult: "notSent" };
		const events = relayLessonEvents(hub.subscribeTeacher(LESSON), {
			endsAt: ENDS_AT,
			pingIntervalMs: 1000,
			now: () => BEFORE_END,
		});

		hub.sendStudentStatus(LESSON, STATUS);
		hub.sendStudentStatus(LESSON, later);

		expect(await take(events)).toEqual(STUDENT);
		expect(await take(events)).toEqual({ event: "student", data: later });
	});

	it("何も届かなくても、決めた間隔ごとに空の知らせを流す", async () => {
		const hub = createLessonHub();
		const events = relayLessonEvents(hub.subscribeStudent(LESSON), {
			endsAt: ENDS_AT,
			pingIntervalMs: PING_INTERVAL_MS,
			now: () => BEFORE_END,
		});
		const startedAt = Date.now();

		const received = [await take(events), await take(events), await take(events)];

		expect(received).toEqual([PING, PING, PING]);
		// 3回分の間隔が過ぎている（タイマーの誤差を1回分だけ見込む）
		expect(Date.now() - startedAt).toBeGreaterThanOrEqual(PING_INTERVAL_MS * 2);
	});

	it("知らせが届き続けていても、空の知らせの間隔は延びない", async () => {
		const hub = createLessonHub();
		const events = relayLessonEvents(hub.subscribeTeacher(LESSON), {
			endsAt: ENDS_AT,
			pingIntervalMs: PING_INTERVAL_MS,
			now: () => BEFORE_END,
		});

		// 空の知らせの間隔より短い間隔で、知らせを送り続ける
		const sending = setInterval(() => hub.sendStudentStatus(LESSON, STATUS), 5);
		const received: unknown[] = [];
		const until = Date.now() + PING_INTERVAL_MS * 5;
		while (Date.now() < until) received.push(await take(events));
		clearInterval(sending);

		expect(received).toContainEqual(STUDENT);
		expect(received).toContainEqual(PING);
	});

	it("endedを流したら、そこで終わる", async () => {
		const hub = createLessonHub();
		const events = relayLessonEvents(hub.subscribeTeacher(LESSON), {
			endsAt: ENDS_AT,
			pingIntervalMs: 1000,
			now: () => BEFORE_END,
		});

		hub.sendStudentStatus(LESSON, STATUS);
		hub.sendEnded(LESSON);
		// 終わりの後に届いた知らせは流さない
		hub.sendStudentStatus(LESSON, STATUS);

		expect(await take(events)).toEqual(STUDENT);
		expect(await take(events)).toEqual(ENDED);
		expect(await take(events)).toBeNull();
	});

	it("授業が終わる時刻より前は、空の知らせを流し続ける", async () => {
		const hub = createLessonHub();
		const events = relayLessonEvents(hub.subscribeStudent(LESSON), {
			endsAt: ENDS_AT,
			pingIntervalMs: PING_INTERVAL_MS,
			now: () => BEFORE_END,
		});

		expect([await take(events), await take(events)]).toEqual([PING, PING]);
	});

	it("授業が終わる時刻になったら、空の知らせの代わりにendedを流して終わる", async () => {
		const hub = createLessonHub();
		let now = BEFORE_END;
		const events = relayLessonEvents(hub.subscribeStudent(LESSON), {
			endsAt: ENDS_AT,
			pingIntervalMs: PING_INTERVAL_MS,
			now: () => now,
		});

		expect(await take(events)).toEqual(PING);
		// 終わる時刻ちょうどから、終わっている扱いになる
		now = ENDS_AT;

		expect(await take(events)).toEqual(ENDED);
		expect(await take(events)).toBeNull();
	});

	it("授業が終わる時刻を過ぎていても、先に届いていた知らせは流す", async () => {
		const hub = createLessonHub();
		const events = relayLessonEvents(hub.subscribeTeacher(LESSON), {
			endsAt: ENDS_AT,
			pingIntervalMs: PING_INTERVAL_MS,
			now: () => AFTER_END,
		});

		hub.sendStudentStatus(LESSON, STATUS);

		expect(await take(events)).toEqual(STUDENT);
		expect(await take(events)).toEqual(ENDED);
		expect(await take(events)).toBeNull();
	});
});
