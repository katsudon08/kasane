import type { AttemptRepository } from "../../domain/repositories/attempt-repository";
import type { StudentRepository } from "../../domain/repositories/student-repository";

type GetMeDeps = {
	studentRepository: StudentRepository;
	attemptRepository: AttemptRepository;
};

// 児童の名前とクリア数を返す。クリア数は保存せず、挑戦の記録から数える
export const getMeUseCase =
	({ studentRepository, attemptRepository }: GetMeDeps) =>
	async ({ studentId }: { studentId: string }): Promise<{ name: string; clearedCount: number }> => {
		const [name, clearedCount] = await Promise.all([
			studentRepository.findName(studentId),
			attemptRepository.countClearedTutorials(studentId),
		]);

		return { name, clearedCount };
	};

export type GetMe = ReturnType<typeof getMeUseCase>;
