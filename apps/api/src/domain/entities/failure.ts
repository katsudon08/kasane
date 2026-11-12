/*
 * ユースケースが返す、想定内の失敗（仕様書backend.mdの「エラーの応答」のコードと同じ名前）
 */

export type FailureReason =
	// 他人の授業・迷路、存在しない
	| "notFound"
	// 授業が終わっている
	| "lessonEnded"
	// 入力が正しくない
	| "invalidInput"
	// チュートリアルが終わっていないのに迷路を作る
	| "mazeLocked"
	// 解放前のチュートリアルに挑戦する
	| "tutorialLocked"
	// 授業の児童の数が上限に達している
	| "lessonFull";

export type Failure<Reason extends FailureReason> = {
	readonly ok: false;
	readonly reason: Reason;
};
