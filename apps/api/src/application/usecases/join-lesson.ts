import { isLessonEnded } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { LessonRepository } from "../../domain/repositories/lesson-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";
import { generateToken, hashToken } from "../../domain/services/token";

type JoinLessonDeps = {
	lessonRepository: LessonRepository;
	studentRepository: StudentRepository;
};

type JoinLessonResult = { ok: true; token: string } | Failure<"notFound" | "lessonEnded">;

/*
 * 授業に参加する。児童の行を作り、トークンを発行する（DBにはハッシュだけを保存する）
 * 同じ授業に同じ名前の児童がいても、新しく作る（名前で引き継ぐと、他の児童の記録を乗っ取れるため）
 */
export const joinLessonUseCase =
	({ lessonRepository, studentRepository }: JoinLessonDeps) =>
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
		await studentRepository.create({ lessonId, name, tokenHash: hashToken(token) });

		return { ok: true, token };
	};

export type JoinLesson = ReturnType<typeof joinLessonUseCase>;
