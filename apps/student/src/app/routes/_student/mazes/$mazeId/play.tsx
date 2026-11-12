import { createFileRoute } from "@tanstack/react-router";

import { MazePlayPage } from "../../../../../pages/maze-detail";

export const Route = createFileRoute("/_student/mazes/$mazeId/play")({
	component: RouteComponent,
});

function RouteComponent() {
	const { mazeId } = Route.useParams();
	return <MazePlayPage key={mazeId} mazeId={mazeId} />;
}
