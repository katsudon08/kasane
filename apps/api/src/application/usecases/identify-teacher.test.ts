import { describe, expect, it, mock } from "bun:test";

import type { StudentIdentity, TeacherIdentity } from "../../domain/entities/identity";
import type { IdentityRepository } from "../../domain/repositories/identity-repository";
import { hashToken } from "../../domain/services/token";
import { identifyTeacherUseCase } from "./identify-teacher";

const TOKEN = "T".repeat(43);

const repositoryReturning = (teacher: TeacherIdentity | null) => {
	const findTeacherByTokenHash = mock(async (_tokenHash: string) => teacher);
	const findStudentByTokenHash = mock(
		async (_tokenHash: string): Promise<StudentIdentity | null> => null,
	);
	const identityRepository: IdentityRepository = { findTeacherByTokenHash, findStudentByTokenHash };
	return { identityRepository, findTeacherByTokenHash, findStudentByTokenHash };
};

describe("identifyTeacherUseCase", () => {
	it("トークンのSHA-256で教師を引き、当たった本人を返す", async () => {
		const { identityRepository, findTeacherByTokenHash } = repositoryReturning({
			teacherId: "teacher-id",
		});
		const identifyTeacher = identifyTeacherUseCase({ identityRepository });

		const teacher = await identifyTeacher(TOKEN);

		expect(teacher).toEqual({ teacherId: "teacher-id" });
		expect(findTeacherByTokenHash).toHaveBeenCalledTimes(1);
		expect(findTeacherByTokenHash).toHaveBeenCalledWith(hashToken(TOKEN));
	});

	it("当たらなければnullを返す", async () => {
		const { identityRepository } = repositoryReturning(null);
		const identifyTeacher = identifyTeacherUseCase({ identityRepository });

		expect(await identifyTeacher(TOKEN)).toBeNull();
	});

	it("児童は引かない（教師のトークンと児童のトークンは別のテーブル）", async () => {
		const { identityRepository, findStudentByTokenHash } = repositoryReturning(null);
		const identifyTeacher = identifyTeacherUseCase({ identityRepository });

		await identifyTeacher(TOKEN);

		expect(findStudentByTokenHash).not.toHaveBeenCalled();
	});
});
