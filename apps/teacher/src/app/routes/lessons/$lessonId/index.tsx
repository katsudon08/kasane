import { createFileRoute } from "@tanstack/react-router";

import { LessonEndedNotice, isLessonId } from "../../../../entities/lesson";
import { LessonProgressPage } from "../../../../pages/lesson-progress";

export const Route = createFileRoute("/lessons/$lessonId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { lessonId } = Route.useParams();
	// 授業のIDの形でない値はAPIのパスに入れない（他人の授業・存在しない授業と同じく、終わった授業として扱う）
	if (!isLessonId(lessonId)) return <LessonEndedNotice />;

	// 別の授業へ移ったときに、前の授業の児童の状態や終わった状態を持ち越さないよう作り直す
	return <LessonProgressPage key={lessonId} lessonId={lessonId} />;
}
