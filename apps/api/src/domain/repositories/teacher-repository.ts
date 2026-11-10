export interface TeacherRepository {
	// トークンのハッシュだけを持つ教師の行を作る
	create(tokenHash: string): Promise<void>;
}
