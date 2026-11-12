/*
 * 授業の終わり（仕様書domain.mdの「授業の終わり」）
 */

// 授業の長さ。午前の4コマと休み時間に、1時間の余裕を足した5時間
export const LESSON_DURATION_MS = 5 * 60 * 60 * 1000;

// 授業を作るときにlessons.endsAtに入れる時刻
export function lessonEndsAt(createdAt: Date): Date {
	return new Date(createdAt.getTime() + LESSON_DURATION_MS);
}

export function isLessonEnded(lesson: { endsAt: Date }, now: Date): boolean {
	return lesson.endsAt.getTime() <= now.getTime();
}
