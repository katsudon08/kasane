import type { CompileResult, Program } from "@kasane/core";
import { TUTORIALS, compile, isTutorialUnlocked, validateProgram } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { AttemptRepository } from "../../domain/repositories/attempt-repository";

type AttemptTutorialDeps = {
	attemptRepository: AttemptRepository;
};

type AttemptTutorialResult =
	| { ok: true; result: CompileResult }
	| Failure<"invalidInput" | "tutorialLocked">;

// チュートリアルno（1から始まる番号）に挑戦する。compileして、記録を保存する
export const attemptTutorialUseCase =
	({ attemptRepository }: AttemptTutorialDeps) =>
	async ({
		studentId,
		no,
		program,
	}: {
		studentId: string;
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

		return { ok: true, result };
	};

export type AttemptTutorial = ReturnType<typeof attemptTutorialUseCase>;
