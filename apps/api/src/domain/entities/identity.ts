/*
 * トークンから特定した本人（仕様書backend.mdの「アクセス制御」）
 */

export type TeacherIdentity = {
	readonly teacherId: string;
};

// 児童のトークンからは授業も一つに決まるので、授業のIDと終わる時刻も一緒に持つ
export type StudentIdentity = {
	readonly studentId: string;
	readonly lessonId: string;
	readonly lessonEndsAt: Date;
};
