import { isLessonEnded } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { Lesson } from "../../domain/entities/lesson";
import type { TeacherServerEvent } from "../../domain/entities/server-event";
import type { StudentStatus } from "../../domain/entities/student-status";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import type { LessonHub, TeacherSubscription } from "../../domain/services/lesson-hub";
import { relayLessonEvents } from "../../domain/services/relay-lesson-events";

type WatchLessonAsTeacherDeps = {
	lessonRepository: LessonRepository;
	studentRepository: StudentRepository;
	lessonHub: Pick<LessonHub, "subscribeTeacher">;
	// 空の知らせを流す間隔
	pingIntervalMs: number;
	now: () => Date;
};

type TeacherEvents = AsyncGenerator<TeacherServerEvent, void, undefined>;

type WatchLessonAsTeacherResult =
	| { ok: true; events: TeacherEvents }
	| Failure<"notFound" | "lessonEnded">;

/*
 * 教師が、自分の授業の知らせを受け取り始める
 * 他の教師の授業・存在しない授業・終わっている授業は、受け取りを始めずに失敗を返す
 */
export const watchLessonAsTeacherUseCase = ({
	lessonRepository,
	studentRepository,
	lessonHub,
	pingIntervalMs,
	now,
}: WatchLessonAsTeacherDeps) => {
	async function* eventsOf(
		subscription: TeacherSubscription,
		lesson: Lesson,
		statuses: StudentStatus[],
	): TeacherEvents {
		try {
			yield { event: "snapshot", data: statuses };
			yield* relayLessonEvents(subscription, { endsAt: lesson.endsAt, pingIntervalMs, now });
		} finally {
			// 接続が切れたとき・授業が終わったときに、送り先から外す
			subscription.close();
		}
	}

	return async ({
		teacherId,
		lessonId,
	}: {
		teacherId: string;
		lessonId: string;
	}): Promise<WatchLessonAsTeacherResult> => {
		const lesson = await lessonRepository.findByIdAndTeacher(lessonId, teacherId);
		if (lesson === null) return { ok: false, reason: "notFound" };
		if (isLessonEnded(lesson, now())) return { ok: false, reason: "lessonEnded" };

		// 先に送り先に登録してから、全児童の状態を読む（逆の順番だと、その間の変化を取りこぼす）
		const subscription = lessonHub.subscribeTeacher(lesson.lessonId);
		try {
			/*
			 * 全児童の状態は、知らせを流し始める前に読んでおく
			 * 流し始めた後の失敗はエラーの応答にできないので、読めなければここで例外にする
			 */
			const statuses = await studentRepository.findStatusesByLesson(lesson.lessonId, teacherId);

			return { ok: true, events: eventsOf(subscription, lesson, statuses) };
		} catch (error) {
			subscription.close();
			throw error;
		}
	};
};

export type WatchLessonAsTeacher = ReturnType<typeof watchLessonAsTeacherUseCase>;
