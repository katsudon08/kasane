import { isLessonEnded } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { generateToken, hashToken } from "../../domain/services/token";
import type { NotifyStudentStatus } from "./notify-student-status";

type JoinLessonDeps = {
	lessonRepository: LessonRepository;
	studentRepository: StudentRepository;
	notifyStudentStatus: NotifyStudentStatus;
};

type JoinLessonResult =
	| { ok: true; token: string }
	| Failure<"notFound" | "lessonEnded" | "lessonFull">;

/*
 * 授業に参加する。児童の行を作り、トークンを発行する（DBにはハッシュだけを保存する）
 * 授業がない・終わっている・児童の数が上限に達している、の順に確かめる
 * 同じ授業に同じ名前の児童がいても、新しく作る（名前で引き継ぐと、他の児童の記録を乗っ取れるため）
 * 行を作った後に、その授業の教師へ児童の状態を送る
 */
export const joinLessonUseCase =
	({ lessonRepository, studentRepository, notifyStudentStatus }: JoinLessonDeps) =>
	async ({
		lessonId,
		name,
		now,
	}: {
		lessonId: string;
		name: string;
		now: Date;
	}): Promise<JoinLessonResult> => {
		const lesson = await lessonRepository.findById(lessonId);
		if (lesson === null) return { ok: false, reason: "notFound" };
		if (isLessonEnded(lesson, now)) return { ok: false, reason: "lessonEnded" };

		const token = generateToken();
		const studentId = await studentRepository.create({
			lessonId: lesson.lessonId,
			name,
			tokenHash: hashToken(token),
		});
		// 児童の数が上限に達していれば、行は作られない
		if (studentId === null) return { ok: false, reason: "lessonFull" };

		// 送り先はDBの授業のIDで引く（本文のIDは大文字でも同じ授業に当たるため）
		await notifyStudentStatus({ lessonId: lesson.lessonId, studentId });

		return { ok: true, token };
	};

export type JoinLesson = ReturnType<typeof joinLessonUseCase>;
