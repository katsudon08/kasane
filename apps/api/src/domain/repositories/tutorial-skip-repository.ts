export interface TutorialSkipRepository {
	/*
	 * 1〜through問目をクリアしたことにする。今までに飛ばした数より小さければ変えない（減らさない）
	 * 本人を特定した後に呼ぶので、児童の行は必ずある
	 */
	skipThrough(studentId: string, through: number): Promise<void>;
}
