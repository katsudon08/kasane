const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// URLのパスから取った値が、授業のID（UUID）の形か。形が違う値はAPIのパスに入れない
export function isLessonId(value: string): boolean {
	return UUID.test(value);
}
