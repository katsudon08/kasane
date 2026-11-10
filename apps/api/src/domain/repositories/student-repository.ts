export interface StudentRepository {
	// トークンのハッシュだけを持つ児童の行を作る
	create(student: { lessonId: string; name: string; tokenHash: string }): Promise<void>;
	// 児童の名前を返す。本人を特定した後に呼ぶので、行がなければ呼び出し側の誤りとして例外にする
	findName(studentId: string): Promise<string>;
}
