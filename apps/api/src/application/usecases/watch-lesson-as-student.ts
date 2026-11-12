import { isLessonEnded } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import { PING } from "../../domain/entities/server-event";
import type { StudentServerEvent } from "../../domain/entities/server-event";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { LessonHub, StudentSubscription } from "../../domain/services/lesson-hub";
import { relayLessonEvents } from "../../domain/services/relay-lesson-events";

type WatchLessonAsStudentDeps = {
	lessonRepository: Pick<LessonRepository, "findById">;
	lessonHub: Pick<LessonHub, "subscribeStudent">;
	// 空の知らせを流す間隔
	pingIntervalMs: number;
	now: () => Date;
};

type StudentEvents = AsyncGenerator<StudentServerEvent, void, undefined>;

type WatchLessonAsStudentResult = { ok: true; events: StudentEvents } | Failure<"lessonEnded">;

/*
 * 児童が、自分の授業の知らせを受け取り始める。本人の特定の後に呼ぶ
 * 児童に流すのは、空の知らせと授業の終わりだけ（他の児童の状態は流さない）
 * 終わっている授業は、受け取りを始めずに失敗を返す
 */
export const watchLessonAsStudentUseCase = ({
	lessonRepository,
	lessonHub,
	pingIntervalMs,
	now,
}: WatchLessonAsStudentDeps) => {
	async function* eventsOf(subscription: StudentSubscription, endsAt: Date): StudentEvents {
		try {
			// 最初の知らせを流すまで応答が始まらないので、つないだ直後に空の知らせを流す
			yield PING;
			yield* relayLessonEvents(subscription, { endsAt, pingIntervalMs, now });
		} finally {
			// 接続が切れたとき・授業が終わったときに、送り先から外す
			subscription.close();
		}
	}

	return async ({ lessonId }: { lessonId: string }): Promise<WatchLessonAsStudentResult> => {
		const subscription = lessonHub.subscribeStudent(lessonId);
		try {
			/*
			 * 授業が終わっていないことは、登録した後に読み直して確かめる
			 * 登録の前に確かめるだけだと、確かめてから登録するまでの間に授業が終わったとき、endedを取りこぼす
			 * 授業のIDは児童のトークンから決まったものなので、授業のIDだけで引く
			 */
			const lesson = await lessonRepository.findById(lessonId);
			if (lesson === null || isLessonEnded(lesson, now())) {
				subscription.close();
				return { ok: false, reason: "lessonEnded" };
			}

			return { ok: true, events: eventsOf(subscription, lesson.endsAt) };
		} catch (error) {
			subscription.close();
			throw error;
		}
	};
};

export type WatchLessonAsStudent = ReturnType<typeof watchLessonAsStudentUseCase>;
