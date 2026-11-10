/*
 * 授業（仕様書backend.mdの「データモデル」）
 */

export type Lesson = {
	readonly lessonId: string;
	readonly createdAt: Date;
	// 授業が終わる時刻。終わったかどうかはisLessonEnded（packages/core）で判定する
	readonly endsAt: Date;
};

// 教師のホームに並べる、開いている授業
export type OpenLesson = {
	readonly lessonId: string;
	readonly createdAt: Date;
	readonly studentCount: number;
};
