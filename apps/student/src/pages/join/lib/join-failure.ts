/*
 * 参加できなかったときに、どの文言を出すか（仕様書README.mdの「授業に参加する」の失敗時の表示）
 * POST /studentsの状態で決める（backend.mdの「エラーの応答」）
 */
export type JoinFailure = "invalidLesson" | "lessonEnded" | "lessonFull" | "offline";

export function joinFailureOf(status: number): JoinFailure {
	// 授業がない（404）と、授業のIDの形が正しくない（422）は、どちらもQRコードを写し直してもらう
	if (status === 404 || status === 422) return "invalidLesson";
	if (status === 410) return "lessonEnded";
	if (status === 403) return "lessonFull";
	// 通信できない（Edenは通信の失敗を503で返す）。サーバーの不調も、もう一度押してもらうしかない
	return "offline";
}
