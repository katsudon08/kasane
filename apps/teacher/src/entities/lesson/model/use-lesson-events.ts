// 教師用のSSEで届いた児童の状態と、授業が終わったか、5秒以上つながっていないかを持つ
import { useEffect, useState } from "react";

import { applyLessonEvent } from "../lib/apply-lesson-event";
import type { LessonStudents } from "./types";
import { watchLesson } from "./watch-lesson";

type LessonEvents = {
	students: LessonStudents;
	ended: boolean;
	disconnectedLong: boolean;
};

export function useLessonEvents(lessonId: string): LessonEvents {
	const [students, setStudents] = useState<LessonStudents>(() => new Map());
	const [ended, setEnded] = useState(false);
	const [disconnectedLong, setDisconnectedLong] = useState(false);

	useEffect(() => {
		// 画面を離れたら（別の授業に移ったときも）接続を切る
		const controller = new AbortController();
		void watchLesson(lessonId, controller.signal, {
			onEvent: (event) => setStudents((current) => applyLessonEvent(current, event)),
			onEnded: () => setEnded(true),
			onDisconnectedLongChange: setDisconnectedLong,
		});
		return () => controller.abort();
	}, [lessonId]);

	return { students, ended, disconnectedLong };
}
