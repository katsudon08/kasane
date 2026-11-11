import { PING } from "../../domain/entities/server-event";
import type { StudentServerEvent } from "../../domain/entities/server-event";
import type { LessonHub } from "../../domain/services/lesson-hub";
import { relayLessonEvents } from "../../domain/services/relay-lesson-events";

type WatchLessonAsStudentDeps = {
	lessonHub: Pick<LessonHub, "subscribeStudent">;
	// 空の知らせを流す間隔
	pingIntervalMs: number;
	now: () => Date;
};

/*
 * 児童が、自分の授業の知らせを受け取り始める。本人の特定と、授業が終わっていないことの確認の後に呼ぶ
 * 児童に流すのは、空の知らせと授業の終わりだけ（他の児童の状態は流さない）
 */
export const watchLessonAsStudentUseCase = ({
	lessonHub,
	pingIntervalMs,
	now,
}: WatchLessonAsStudentDeps) =>
	async function* ({
		lessonId,
		lessonEndsAt,
	}: {
		lessonId: string;
		lessonEndsAt: Date;
	}): AsyncGenerator<StudentServerEvent, void, undefined> {
		const subscription = lessonHub.subscribeStudent(lessonId);
		try {
			// 最初の知らせを流すまで応答が始まらないので、つないだ直後に空の知らせを流す
			yield PING;
			yield* relayLessonEvents(subscription, { endsAt: lessonEndsAt, pingIntervalMs, now });
		} finally {
			// 接続が切れたとき・授業が終わったときに、送り先から外す
			subscription.close();
		}
	};

export type WatchLessonAsStudent = ReturnType<typeof watchLessonAsStudentUseCase>;
