import type { TeacherIdentity } from "../../domain/entities/identity";
import type { IdentityRepository } from "../../domain/repositories/identity-repository";
import { hashToken } from "../../domain/services/token";

type IdentifyTeacherDeps = {
	identityRepository: IdentityRepository;
};

// 教師のトークンから本人を特定する。当たらなければnull
export const identifyTeacherUseCase =
	({ identityRepository }: IdentifyTeacherDeps) =>
	async (token: string): Promise<TeacherIdentity | null> =>
		identityRepository.findTeacherByTokenHash(hashToken(token));

export type IdentifyTeacher = ReturnType<typeof identifyTeacherUseCase>;
