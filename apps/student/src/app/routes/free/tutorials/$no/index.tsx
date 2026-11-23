import { createFileRoute } from "@tanstack/react-router";

import { TutorialDetailPage } from "../../../../../pages/tutorial-detail";

export const Route = createFileRoute("/free/tutorials/$no/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { no } = Route.useParams();
	return <TutorialDetailPage key={no} noParam={no} />;
}
