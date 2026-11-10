import type { StudentIdentity } from "../../domain/entities/identity";
import type { IdentityRepository } from "../../domain/repositories/identity-repository";
import { hashToken } from "../../domain/services/token";

type IdentifyStudentDeps = {
	identityRepository: IdentityRepository;
};

// 児童のトークンから本人と授業を特定する。当たらなければnull
export const identifyStudentUseCase =
	({ identityRepository }: IdentifyStudentDeps) =>
	async (token: string): Promise<StudentIdentity | null> =>
		identityRepository.findStudentByTokenHash(hashToken(token));

export type IdentifyStudent = ReturnType<typeof identifyStudentUseCase>;
