import { createFileRoute } from "@tanstack/react-router";

import { LessonInvitePage } from "../../../../pages/lesson-invite";

export const Route = createFileRoute("/lessons/$lessonId/invite")({
	component: RouteComponent,
});

function RouteComponent() {
	const { lessonId } = Route.useParams();
	return <LessonInvitePage lessonId={lessonId} />;
}
