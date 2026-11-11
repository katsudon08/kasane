import { createFileRoute } from "@tanstack/react-router";

import { LessonProgressPage } from "../../../../pages/lesson-progress";

export const Route = createFileRoute("/lessons/$lessonId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { lessonId } = Route.useParams();
	// 別の授業へ移ったときに、前の授業の児童の状態や終わった状態を持ち越さないよう作り直す
	return <LessonProgressPage key={lessonId} lessonId={lessonId} />;
}
