import type { Failure } from "../../domain/entities/failure";
import type { MazeRepository } from "../../domain/repositories/maze-repository";

type DeleteMazeDeps = {
	mazeRepository: MazeRepository;
};

type DeleteMazeResult = { ok: true } | Failure<"notFound">;

// 自分の迷路を消す。その迷路への挑戦の記録も一緒に消える
export const deleteMazeUseCase =
	({ mazeRepository }: DeleteMazeDeps) =>
	async ({
		studentId,
		mazeId,
	}: {
		studentId: string;
		mazeId: string;
	}): Promise<DeleteMazeResult> => {
		const deleted = await mazeRepository.delete(mazeId, studentId);
		if (!deleted) return { ok: false, reason: "notFound" };

		return { ok: true };
	};

export type DeleteMaze = ReturnType<typeof deleteMazeUseCase>;
