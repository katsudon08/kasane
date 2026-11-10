import { canCreateMaze, validateMaze } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { MazeContent } from "../../domain/entities/maze";
import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import type { MazeRepository } from "../../domain/repositories/maze-repository";

type CreateMazeDeps = {
	mazeRepository: MazeRepository;
	attemptRepository: AttemptRepository;
};

type CreateMazeResult = { ok: true; mazeId: string } | Failure<"mazeLocked" | "invalidInput">;

// 自分の迷路を作る。チュートリアルを全部クリアしてから
export const createMazeUseCase =
	({ mazeRepository, attemptRepository }: CreateMazeDeps) =>
	async ({
		studentId,
		content,
	}: {
		studentId: string;
		content: MazeContent;
	}): Promise<CreateMazeResult> => {
		const clearedCount = await attemptRepository.countClearedTutorials(studentId);
		if (!canCreateMaze(clearedCount)) return { ok: false, reason: "mazeLocked" };

		if (!validateMaze(content.data).ok) return { ok: false, reason: "invalidInput" };

		const mazeId = await mazeRepository.create(studentId, content);

		return { ok: true, mazeId };
	};

export type CreateMaze = ReturnType<typeof createMazeUseCase>;
