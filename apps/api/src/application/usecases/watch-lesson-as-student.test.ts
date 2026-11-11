/*
 * 児童が授業の知らせを受け取り始める（仕様書backend.mdの「サーバーからの知らせ（SSE）」）
 * 児童に流れるのが空の知らせと授業の終わりだけであることと、接続が切れたときの後始末を確かめる
 */
import { describe, expect, it, mock } from "bun:test";

import type { Lesson } from "../../domain/entities/lesson";
import type { StudentStatus } from "../../domain/entities/student-status";
import { createLessonHub } from "../../domain/services/lesson-hub";
import type { LessonHub } from "../../domain/services/lesson-hub";
import { watchLessonAsStudentUseCase } from "./watch-lesson-as-student";

const LESSON = "lesson-a";
const OTHER_LESSON = "lesson-b";

const STATUS: StudentStatus = {
	studentId: "student-1",
	name: "たろう",
	clearedCount: 0,
	lastResult: "failed",
};

const PING = { event: "ping", data: null } as const;
const ENDED = { event: "ended", data: null } as const;

// テストでは、空の知らせの間隔を短くする
const PING_INTERVAL_MS = 20;
// 間隔を待たずに届くことを確かめるときの、長い間隔
const LONG_INTERVAL_MS = 60 * 1000;

// 授業が終わる時刻と、その前の時刻
const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");
const BEFORE_END = new Date("2026-11-10T04:59:59.999Z");

// 送り先に登録した後にDBから読み直す授業
const LESSON_ROW: Lesson = {
	lessonId: LESSON,
	createdAt: new Date("2026-11-10T00:00:00.000Z"),
	endsAt: ENDS_AT,
};

// 次の知らせを一つ取り出す。流れが終わっていればnull
const take = async <Event>(events: AsyncGenerator<Event>): Promise<Event | null> => {
	const { done, value } = await events.next();
	return done ? null : value;
};

// 送り先から外したかどうかを見られるようにする
const hubRecordingClose = () => {
	const hub = createLessonHub();
	const closed = mock(() => {});
	const lessonHub: Pick<LessonHub, "subscribeStudent"> = {
		subscribeStudent(lessonId) {
			const subscription = hub.subscribeStudent(lessonId);
			return {
				next: (timeoutMs) => subscription.next(timeoutMs),
				close() {
					closed();
					subscription.close();
				},
			};
		},
	};
	return { hub, lessonHub, closed };
};

type Setup = {
	lessonHub?: Pick<LessonHub, "subscribeStudent">;
	pingIntervalMs?: number;
	now?: () => Date;
};

// 児童が受け取りを始める。始められなければテストを失敗させる
const watch = async ({
	lessonHub = createLessonHub(),
	pingIntervalMs = PING_INTERVAL_MS,
	now = () => BEFORE_END,
}: Setup = {}) => {
	const result = await watchLessonAsStudentUseCase({
		lessonRepository: { findById: async () => LESSON_ROW },
		lessonHub,
		pingIntervalMs,
		now,
	})({ lessonId: LESSON });
	if (!result.ok) throw new Error(`受け取りを始められませんでした: ${result.reason}`);
	return result.events;
};

describe("watchLessonAsStudentUseCase", () => {
	it("つないだ直後に、間隔を待たずに空の知らせを流す", async () => {
		const events = await watch({ pingIntervalMs: LONG_INTERVAL_MS });

		expect(await take(events)).toEqual(PING);
		await events.return();
	});

	it("その後も、決めた間隔ごとに空の知らせを流す", async () => {
		const events = await watch();

		expect([await take(events), await take(events), await take(events)]).toEqual([
			PING,
			PING,
			PING,
		]);
		await events.return();
	});

	it("他の児童の状態が教師に送られても、児童には流さない", async () => {
		const lessonHub = createLessonHub();
		const events = await watch({ lessonHub });
		await take(events);

		lessonHub.sendStudentStatus(LESSON, STATUS);

		expect([await take(events), await take(events)]).toEqual([PING, PING]);
		await events.return();
	});

	it("授業が終わると、endedを流して終わり、送り先から外れる", async () => {
		const { hub, lessonHub, closed } = hubRecordingClose();
		const events = await watch({ lessonHub, pingIntervalMs: LONG_INTERVAL_MS });
		await take(events);

		hub.sendEnded(LESSON);

		expect(await take(events)).toEqual(ENDED);
		expect(await take(events)).toBeNull();
		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("他の授業が終わっても、endedを流さない", async () => {
		const lessonHub = createLessonHub();
		const events = await watch({ lessonHub });
		await take(events);

		lessonHub.sendEnded(OTHER_LESSON);

		expect([await take(events), await take(events)]).toEqual([PING, PING]);
		await events.return();
	});

	it("授業が終わる時刻になると、空の知らせの代わりにendedを流して終わり、送り先から外れる", async () => {
		const { lessonHub, closed } = hubRecordingClose();
		let now = BEFORE_END;
		const events = await watch({ lessonHub, now: () => now });

		expect([await take(events), await take(events)]).toEqual([PING, PING]);
		now = ENDS_AT;

		expect(await take(events)).toEqual(ENDED);
		expect(await take(events)).toBeNull();
		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("接続が切れると、送り先から外れる", async () => {
		const { lessonHub, closed } = hubRecordingClose();
		const events = await watch({ lessonHub });
		await take(events);
		await take(events);
		expect(closed).not.toHaveBeenCalled();

		await events.return();

		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("最初の空の知らせの直後に接続が切れても、送り先から外れる", async () => {
		const { lessonHub, closed } = hubRecordingClose();
		const events = await watch({ lessonHub, pingIntervalMs: LONG_INTERVAL_MS });

		expect(await take(events)).toEqual(PING);
		await events.return();

		expect(closed).toHaveBeenCalledTimes(1);
	});
});
