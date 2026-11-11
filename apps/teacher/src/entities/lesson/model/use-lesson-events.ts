// 教師用のSSEで届いた児童の状態と、授業が終わったか、5秒以上つながっていないかを持つ
import { useEffect, useState } from "react";

import { applyLessonEvent } from "../lib/apply-lesson-event";
import type { LessonStudents } from "./types";
import { watchLesson } from "./watch-lesson";

type LessonEvents = {
	students: LessonStudents;
	// 全児童の状態（snapshot）を一度でも受け取ったか。受け取る前は、児童がいないのか、まだ届いていないのかが分からない
	synced: boolean;
	ended: boolean;
	disconnectedLong: boolean;
};

export function useLessonEvents(lessonId: string): LessonEvents {
	const [students, setStudents] = useState<LessonStudents>(() => new Map());
	const [synced, setSynced] = useState(false);
	const [ended, setEnded] = useState(false);
	const [disconnectedLong, setDisconnectedLong] = useState(false);

	useEffect(() => {
		// 画面を離れたら（別の授業に移ったときも）接続を切る
		const controller = new AbortController();
		void watchLesson(lessonId, controller.signal, {
			onEvent: (event) => {
				if (event.event === "snapshot") setSynced(true);
				setStudents((current) => applyLessonEvent(current, event));
			},
			onEnded: () => setEnded(true),
			onDisconnectedLongChange: setDisconnectedLong,
		});
		return () => controller.abort();
	}, [lessonId]);

	return { students, synced, ended, disconnectedLong };
}
