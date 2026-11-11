import { createFileRoute } from "@tanstack/react-router";

import { LessonProgressPage } from "../../../../pages/lesson-progress";

export const Route = createFileRoute("/lessons/$lessonId/")({
	component: LessonProgressPage,
});
