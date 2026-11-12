import { canCreateMaze, validateMaze } from "@kasane/core";

import type { Failure } from "../../domain/entities/failure";
import type { MazeContent } from "../../domain/entities/maze";
import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import type { MazeRepository } from "../../domain/repositories/maze-repository";

type ReplaceMazeDeps = {
	mazeRepository: MazeRepository;
	attemptRepository: AttemptRepository;
};

type ReplaceMazeResult = { ok: true } | Failure<"mazeLocked" | "invalidInput" | "notFound">;

// 自分の迷路の名前と中身を丸ごと置き換える。作るときと同じ検査を通す
export const replaceMazeUseCase =
	({ mazeRepository, attemptRepository }: ReplaceMazeDeps) =>
	async ({
		studentId,
		mazeId,
		content,
	}: {
		studentId: string;
		mazeId: string;
		content: MazeContent;
	}): Promise<ReplaceMazeResult> => {
		const clearedCount = await attemptRepository.countClearedTutorials(studentId);
		if (!canCreateMaze(clearedCount)) return { ok: false, reason: "mazeLocked" };

		if (!validateMaze(content.data).ok) return { ok: false, reason: "invalidInput" };

		const replaced = await mazeRepository.replace(mazeId, studentId, content);
		if (!replaced) return { ok: false, reason: "notFound" };

		return { ok: true };
	};

export type ReplaceMaze = ReturnType<typeof replaceMazeUseCase>;
