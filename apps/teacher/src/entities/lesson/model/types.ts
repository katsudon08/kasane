// 教師に見せる児童の状態（仕様書backend.mdの「教師に見せる状態の求め方」のStudentStatus）
export type StudentStatus = {
	readonly studentId: string;
	readonly name: string;
	readonly clearedCount: number;
	readonly lastResult: "notSent" | "succeeded" | "failed";
};

// 教師用のSSEで届く知らせ（backend.mdの「サーバーからの知らせ（SSE）」）。pingは接続を切られないための空の知らせ
export type LessonEvent =
	| { readonly event: "snapshot"; readonly data: readonly StudentStatus[] }
	| { readonly event: "student"; readonly data: StudentStatus }
	| { readonly event: "ended"; readonly data: unknown }
	| { readonly event: "ping"; readonly data: unknown };

// 児童のIDをキーにした、児童の状態。並びは参加順
export type LessonStudents = ReadonlyMap<string, StudentStatus>;
