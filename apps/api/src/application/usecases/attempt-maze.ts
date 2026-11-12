import type { CompileResult, Program } from "@kasane/core";
import { compile, validateProgram } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import type { MazeRepository } from "../../domain/repositories/maze-repository";
import type { NotifyStudentStatus } from "./notify-student-status";

type AttemptMazeDeps = {
	mazeRepository: MazeRepository;
	attemptRepository: AttemptRepository;
	notifyStudentStatus: NotifyStudentStatus;
};

type AttemptMazeResult = { ok: true; result: CompileResult } | Failure<"notFound" | "invalidInput">;

// 自分の迷路に挑戦する。compileして記録を保存し、その授業の教師へ児童の状態を送る。自分の迷路には枚数の上限がない
export const attemptMazeUseCase =
	({ mazeRepository, attemptRepository, notifyStudentStatus }: AttemptMazeDeps) =>
	async ({
		studentId,
		lessonId,
		mazeId,
		program,
	}: {
		studentId: string;
		lessonId: string;
		mazeId: string;
		program: Program;
	}): Promise<AttemptMazeResult> => {
		const maze = await mazeRepository.findByIdAndStudent(mazeId, studentId);
		if (maze === null) return { ok: false, reason: "notFound" };

		if (!validateProgram(program, null).ok) return { ok: false, reason: "invalidInput" };

		const result = compile(maze.data, program);
		await attemptRepository.create({
			studentId,
			target: { mazeId },
			program,
			succeeded: result.outcome === "goal",
		});
		// 記録が入ったことを確かめてから送る
		await notifyStudentStatus({ lessonId, studentId });

		return { ok: true, result };
	};

export type AttemptMaze = ReturnType<typeof attemptMazeUseCase>;
