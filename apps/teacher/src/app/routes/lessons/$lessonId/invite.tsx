import { createFileRoute } from "@tanstack/react-router";

import { LessonInvitePage } from "../../../../pages/lesson-invite";

export const Route = createFileRoute("/lessons/$lessonId/invite")({
	component: RouteComponent,
});

function RouteComponent() {
	const { lessonId } = Route.useParams();
	// 別の授業へ移ったときに、前の授業の人数や終わった状態を持ち越さないよう作り直す
	return <LessonInvitePage key={lessonId} lessonId={lessonId} />;
}
