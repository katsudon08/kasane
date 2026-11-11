import type { LessonEvent, LessonStudents } from "../model/types";

/*
 * 教師用のSSEで届いた知らせを、児童のIDをキーにしたMapへ入れた新しいMapを返す
 * snapshotは丸ごと置き換え（つなぎ直したときに追いつくため）、studentはその児童の状態全体で上書きする
 */
export function applyLessonEvent(students: LessonStudents, event: LessonEvent): LessonStudents {
	switch (event.event) {
		case "snapshot":
			return new Map(event.data.map((student) => [student.studentId, student]));
		case "student":
			return new Map(students).set(event.data.studentId, event.data);
		case "ended":
		case "ping":
			return students;
	}
}
