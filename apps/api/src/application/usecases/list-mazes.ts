import type { OwnMaze } from "../../domain/entities/maze";
import type { MazeRepository } from "../../domain/repositories/maze-repository";

type ListMazesDeps = {
	mazeRepository: MazeRepository;
};

// 自分の迷路を、変えた時刻が新しい順に返す
export const listMazesUseCase =
	({ mazeRepository }: ListMazesDeps) =>
	async ({ studentId }: { studentId: string }): Promise<OwnMaze[]> =>
		mazeRepository.findByStudent(studentId);

export type ListMazes = ReturnType<typeof listMazesUseCase>;
