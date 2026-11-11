import { isLessonEnded } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { LessonHub } from "../../domain/services/lesson-hub";

type CloseLessonDeps = {
	lessonRepository: LessonRepository;
	lessonHub: Pick<LessonHub, "sendEnded">;
};

type CloseLessonResult = { ok: true } | Failure<"notFound" | "lessonEnded">;

// 授業を終える。終わる時刻を今の時刻で上書きし、その授業の教師（押した教師の接続も含む）と児童の全員に終わりを知らせる
export const closeLessonUseCase =
	({ lessonRepository, lessonHub }: CloseLessonDeps) =>
	async ({
		teacherId,
		lessonId,
		now,
	}: {
		teacherId: string;
		lessonId: string;
		now: Date;
	}): Promise<CloseLessonResult> => {
		const lesson = await lessonRepository.findByIdAndTeacher(lessonId, teacherId);
		if (lesson === null) return { ok: false, reason: "notFound" };
		if (isLessonEnded(lesson, now)) return { ok: false, reason: "lessonEnded" };

		await lessonRepository.updateEndsAt(lessonId, teacherId, now);
		// 送り先はDBの授業のIDで引く（パスのIDは大文字でも同じ授業に当たるため）
		lessonHub.sendEnded(lesson.lessonId);

		return { ok: true };
	};

export type CloseLesson = ReturnType<typeof closeLessonUseCase>;
