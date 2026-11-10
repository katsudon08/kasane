import type { CompileResult, Program } from "@kasane/core";
import { compile, validateProgram } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import type { MazeRepository } from "../../domain/repositories/maze-repository";

type AttemptMazeDeps = {
	mazeRepository: MazeRepository;
	attemptRepository: AttemptRepository;
};

type AttemptMazeResult = { ok: true; result: CompileResult } | Failure<"notFound" | "invalidInput">;

// 自分の迷路に挑戦する。compileして、記録を保存する。自分の迷路には枚数の上限がない
export const attemptMazeUseCase =
	({ mazeRepository, attemptRepository }: AttemptMazeDeps) =>
	async ({
		studentId,
		mazeId,
		program,
	}: {
		studentId: string;
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

		return { ok: true, result };
	};

export type AttemptMaze = ReturnType<typeof attemptMazeUseCase>;
