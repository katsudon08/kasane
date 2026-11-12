/*
 * 教師に見せる児童の状態（仕様書backend.mdの「教師に見せる状態の求め方」）
 * 保存せず、挑戦の記録から求める
 */

// 今の問題の結果。今の問題で一度も送っていなければnotSent
export type LastResult = "notSent" | "succeeded" | "failed";

export type StudentStatus = {
	readonly studentId: string;
	readonly name: string;
	// 成功した記録にあるチュートリアルの種類の数
	readonly clearedCount: number;
	readonly lastResult: LastResult;
};
