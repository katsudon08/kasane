import type { TeacherRepository } from "../../domain/repositories/teacher-repository";
import { generateToken, hashToken } from "../../domain/services/token";

type RegisterTeacherDeps = {
	teacherRepository: TeacherRepository;
};

// 教師の行を作り、トークンを発行する。DBにはハッシュだけを保存する
export const registerTeacherUseCase =
	({ teacherRepository }: RegisterTeacherDeps) =>
	async (): Promise<{ token: string }> => {
		const token = generateToken();
		await teacherRepository.create(hashToken(token));

		return { token };
	};

export type RegisterTeacher = ReturnType<typeof registerTeacherUseCase>;
