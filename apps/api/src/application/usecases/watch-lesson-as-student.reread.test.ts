/*
 * 児童が授業の知らせを受け取り始めるときに、送り先に登録した後で授業をDBから読み直す
 * （仕様書backend.mdの「サーバーからの知らせ（SSE）」の「授業が終わっていないことは、送り先に登録した後にDBを読み直して確かめる」と、児童用の流れ）
 * 確かめてから登録するまでの間に授業が終わっても、endedを取りこぼさないことを確かめる
 */
import { describe, expect, it, mock } from "bun:test";

import type { Lesson } from "../../domain/entities/lesson";
import { createLessonHub } from "../../domain/services/lesson-hub";
import type { LessonHub } from "../../domain/services/lesson-hub";
import { watchLessonAsStudentUseCase } from "./watch-lesson-as-student";

// 授業が終わる時刻と、その前の時刻
const ENDS_AT = new Date("2026-11-10T05:00:00.000Z");
const NOW = new Date("2026-11-10T02:00:00.000Z");

// 開いている授業
const LESSON: Lesson = {
	lessonId: "lesson-a",
	createdAt: new Date("2026-11-10T00:00:00.000Z"),
	endsAt: ENDS_AT,
};
// 教師が「授業を終える」を押して、終わる時刻が今の時刻で上書きされた授業
const CLOSED_LESSON: Lesson = { ...LESSON, endsAt: NOW };

const ENDED = { event: "ended", data: null } as const;

// 間隔を待たずに届くことを確かめるための、長い間隔
const LONG_INTERVAL_MS = 60 * 1000;

type FindById = (lessonId: string) => Promise<Lesson | null>;

const setup = (findById: FindById) => {
	const hub = createLessonHub();
	// 呼ばれた順番を残す
	const calls: string[] = [];
	const closed = mock(() => {});
	// 送り先に登録したこと・外したことを見られるようにする
	const lessonHub: Pick<LessonHub, "subscribeStudent"> = {
		subscribeStudent(lessonId) {
			calls.push("subscribe");
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
	const findByIdMock = mock(async (lessonId: string) => {
		calls.push("findById");
		return findById(lessonId);
	});
	const watch = () =>
		watchLessonAsStudentUseCase({
			lessonRepository: { findById: findByIdMock },
			lessonHub,
			pingIntervalMs: LONG_INTERVAL_MS,
			now: () => NOW,
		})({ lessonId: LESSON.lessonId });

	return { watch, hub, calls, closed, findById: findByIdMock };
};

// 空の知らせを読み飛ばして、次の知らせを一つ取り出す。流れが終わっていればnull
const takeExceptPing = async <Event extends { readonly event: string }>(
	events: AsyncGenerator<Event>,
): Promise<Event | null> => {
	for (;;) {
		const { done, value } = await events.next();
		if (done) return null;
		if (value.event !== "ping") return value;
	}
};

describe("watchLessonAsStudentUseCase（登録した後の読み直し）", () => {
	it("送り先に登録した後に、授業をDBから読み直す", async () => {
		const { watch, calls, findById } = setup(async () => LESSON);

		const result = await watch();

		expect(result.ok).toBe(true);
		expect(calls).toEqual(["subscribe", "findById"]);
		expect(findById).toHaveBeenCalledWith(LESSON.lessonId);
	});

	it("読み直すと終わっていたら（確かめてから登録するまでの間に終わった）、送り先から外してlessonEndedを返す", async () => {
		const { watch, closed } = setup(async () => CLOSED_LESSON);

		const result = await watch();

		expect(result).toEqual({ ok: false, reason: "lessonEnded" });
		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("読み直した結果が終わる前なら、その後に送られたendedを取りこぼさない", async () => {
		const { watch, hub, closed } = setup(async (lessonId) => {
			// 終わる前の授業を読んだ直後に、教師が授業を終える（終わる時刻を上書きしてからendedを送る）
			hub.sendEnded(lessonId);
			return LESSON;
		});

		const result = await watch();
		if (!result.ok) throw new Error(`受け取りを始められませんでした: ${result.reason}`);

		expect(await takeExceptPing(result.events)).toEqual(ENDED);
		expect(await takeExceptPing(result.events)).toBeNull();
		expect(closed).toHaveBeenCalledTimes(1);
	});

	it("読み直せなければ、送り先から外して例外にする（知らせを流し始めない）", async () => {
		const { watch, closed } = setup(async () => {
			throw new Error("DBにつながりません");
		});

		const rejection = await watch().then(
			() => null,
			(error: unknown) => error,
		);

		expect(rejection).toHaveProperty("message", "DBにつながりません");
		expect(closed).toHaveBeenCalledTimes(1);
	});
});
