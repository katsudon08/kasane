import { createFileRoute } from "@tanstack/react-router";

import { TutorialPlayPage } from "../../../../../pages/tutorial-detail";

export const Route = createFileRoute("/_student/tutorials/$no/play")({
	component: RouteComponent,
});

function RouteComponent() {
	const { no } = Route.useParams();
	return <TutorialPlayPage key={no} noParam={no} />;
}
