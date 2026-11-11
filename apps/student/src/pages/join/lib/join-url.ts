// 授業QRの中身から授業のIDを取り出す（仕様書README.mdの「授業に参加する」）

// 授業のID（lessons.id）の形。APIの入力と同じく、urn:uuid:付きなどは通さない
const LESSON_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLessonId(value: string): boolean {
	return LESSON_ID_PATTERN.test(value);
}

/*
 * 授業QRには{STUDENT_ORIGIN}/join?lesson={授業のID}のURLが入っている
 * originは児童用アプリ自身のオリジン。ほかのオリジンのURLや、命令カードのような別のQRならnull
 */
export function lessonIdFromJoinUrl(text: string, origin: string): string | null {
	if (!URL.canParse(text)) return null;

	const url = new URL(text);
	if (url.origin !== origin || url.pathname !== "/join") return null;

	const lessonId = url.searchParams.get("lesson");
	return lessonId !== null && isLessonId(lessonId) ? lessonId : null;
}
