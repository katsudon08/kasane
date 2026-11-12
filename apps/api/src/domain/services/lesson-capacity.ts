/*
 * 1授業の児童の数の上限（仕様書backend.mdの「入力の上限」）
 * つないでいる台数ではなく、その授業のstudentsの行の数で数える
 */
export const MAX_STUDENTS_PER_LESSON = 300;

// その授業に、これ以上児童が参加できないか
export const isLessonFull = (studentCount: number): boolean =>
	studentCount >= MAX_STUDENTS_PER_LESSON;
