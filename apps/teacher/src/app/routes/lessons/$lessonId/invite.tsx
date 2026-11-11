import { createFileRoute } from "@tanstack/react-router";

import { LessonEndedNotice, isLessonId } from "../../../../entities/lesson";
import { LessonInvitePage } from "../../../../pages/lesson-invite";

export const Route = createFileRoute("/lessons/$lessonId/invite")({
	component: RouteComponent,
});

function RouteComponent() {
	const { lessonId } = Route.useParams();
	// 授業のIDの形でない値はAPIのパスに入れない（他人の授業・存在しない授業と同じく、終わった授業として扱う）
	if (!isLessonId(lessonId)) return <LessonEndedNotice />;

	// 別の授業へ移ったときに、前の授業の人数や終わった状態を持ち越さないよう作り直す
	return <LessonInvitePage key={lessonId} lessonId={lessonId} />;
}
