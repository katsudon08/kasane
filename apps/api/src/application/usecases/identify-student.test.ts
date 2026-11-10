import { describe, expect, it, mock } from "bun:test";

import type { StudentIdentity, TeacherIdentity } from "../../domain/entities/identity";
import type { IdentityRepository } from "../../domain/repositories/identity-repository";
import { hashToken } from "../../domain/services/token";
import { identifyStudentUseCase } from "./identify-student";

const TOKEN = "S".repeat(43);

const STUDENT: StudentIdentity = {
	studentId: "student-id",
	lessonId: "lesson-id",
	lessonEndsAt: new Date("2026-11-10T05:00:00.000Z"),
};

const repositoryReturning = (student: StudentIdentity | null) => {
	const findTeacherByTokenHash = mock(
		async (_tokenHash: string): Promise<TeacherIdentity | null> => null,
	);
	const findStudentByTokenHash = mock(async (_tokenHash: string) => student);
	const identityRepository: IdentityRepository = { findTeacherByTokenHash, findStudentByTokenHash };
	return { identityRepository, findTeacherByTokenHash, findStudentByTokenHash };
};

describe("identifyStudentUseCase", () => {
	it("トークンのSHA-256で児童を引き、当たった本人と授業を返す", async () => {
		const { identityRepository, findStudentByTokenHash } = repositoryReturning(STUDENT);
		const identifyStudent = identifyStudentUseCase({ identityRepository });

		const student = await identifyStudent(TOKEN);

		expect(student).toEqual(STUDENT);
		expect(findStudentByTokenHash).toHaveBeenCalledTimes(1);
		expect(findStudentByTokenHash).toHaveBeenCalledWith(hashToken(TOKEN));
	});

	it("当たらなければnullを返す", async () => {
		const { identityRepository } = repositoryReturning(null);
		const identifyStudent = identifyStudentUseCase({ identityRepository });

		expect(await identifyStudent(TOKEN)).toBeNull();
	});

	it("教師は引かない（教師のトークンと児童のトークンは別のテーブル）", async () => {
		const { identityRepository, findTeacherByTokenHash } = repositoryReturning(null);
		const identifyStudent = identifyStudentUseCase({ identityRepository });

		await identifyStudent(TOKEN);

		expect(findTeacherByTokenHash).not.toHaveBeenCalled();
	});
});
