import type { CompileResult, Program } from "@kasane/core";
import { TUTORIALS, compile, isTutorialUnlocked, validateProgram } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import type { NotifyStudentStatus } from "./notify-student-status";

type AttemptTutorialDeps = {
	attemptRepository: AttemptRepository;
	notifyStudentStatus: NotifyStudentStatus;
};

type AttemptTutorialResult =
	| { ok: true; result: CompileResult }
	| Failure<"invalidInput" | "tutorialLocked">;

// チュートリアルno（1から始まる番号）に挑戦する。compileして記録を保存し、その授業の教師へ児童の状態を送る
export const attemptTutorialUseCase =
	({ attemptRepository, notifyStudentStatus }: AttemptTutorialDeps) =>
	async ({
		studentId,
		lessonId,
		no,
		program,
	}: {
		studentId: string;
		lessonId: string;
		no: number;
		program: Program;
	}): Promise<AttemptTutorialResult> => {
		const tutorial = TUTORIALS[no - 1];
		if (tutorial === undefined) return { ok: false, reason: "invalidInput" };

		// チュートリアルは順番に解く前提なので、解放前の問題は受け付けない
		const clearedCount = await attemptRepository.countClearedTutorials(studentId);
		if (!isTutorialUnlocked(no, clearedCount)) return { ok: false, reason: "tutorialLocked" };

		if (!validateProgram(program, tutorial.maxCards).ok) {
			return { ok: false, reason: "invalidInput" };
		}

		const result = compile(tutorial.maze, program);
		await attemptRepository.create({
			studentId,
			target: { tutorialNo: no },
			program,
			succeeded: result.outcome === "goal",
		});
		// 記録が入ったことを確かめてから送る
		await notifyStudentStatus({ lessonId, studentId });

		return { ok: true, result };
	};

export type AttemptTutorial = ReturnType<typeof attemptTutorialUseCase>;
