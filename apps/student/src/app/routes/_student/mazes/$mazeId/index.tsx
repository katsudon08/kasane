import { createFileRoute } from "@tanstack/react-router";

import { MazeDetailPage } from "../../../../../pages/maze-detail";

export const Route = createFileRoute("/_student/mazes/$mazeId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { mazeId } = Route.useParams();
	return <MazeDetailPage key={mazeId} mazeId={mazeId} />;
}
