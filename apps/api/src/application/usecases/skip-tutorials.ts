import { TUTORIALS } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { TutorialSkipRepository } from "../../domain/repositories/tutorial-skip-repository";
import type { NotifyStudentStatus } from "./notify-student-status";

type SkipTutorialsDeps = {
	tutorialSkipRepository: TutorialSkipRepository;
	notifyStudentStatus: NotifyStudentStatus;
};

type SkipTutorialsResult = { ok: true } | Failure<"invalidInput">;

// 飛ばす先の範囲。2問目から、全部飛ばす（チュートリアルの数＋1）まで
const MIN_TO = 2;
const MAX_TO = TUTORIALS.length + 1;

/*
 * 問題を飛ばす（仕様書backend.mdのPOST /me/tutorials/skip、README.mdの「問題を飛ばす」）
 * to問目から始められるよう、1〜to - 1問目をクリアしたことにし、その授業の教師へ児童の状態を送る
 */
export const skipTutorialsUseCase =
	({ tutorialSkipRepository, notifyStudentStatus }: SkipTutorialsDeps) =>
	async ({
		studentId,
		lessonId,
		to,
	}: {
		studentId: string;
		lessonId: string;
		to: number;
	}): Promise<SkipTutorialsResult> => {
		if (!Number.isInteger(to) || to < MIN_TO || to > MAX_TO) {
			return { ok: false, reason: "invalidInput" };
		}

		await tutorialSkipRepository.skipThrough(studentId, to - 1);
		// 保存してから送る（教師に届く状態がDBと一致するように）
		await notifyStudentStatus({ lessonId, studentId });

		return { ok: true };
	};

export type SkipTutorials = ReturnType<typeof skipTutorialsUseCase>;
