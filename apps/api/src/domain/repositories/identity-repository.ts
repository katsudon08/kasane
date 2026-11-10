import type { StudentIdentity, TeacherIdentity } from "../entities/identity";

// トークンのハッシュから本人を引く。当たらなければnull
export interface IdentityRepository {
	findTeacherByTokenHash(tokenHash: string): Promise<TeacherIdentity | null>;
	findStudentByTokenHash(tokenHash: string): Promise<StudentIdentity | null>;
}
