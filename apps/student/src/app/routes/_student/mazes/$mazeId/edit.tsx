import { createFileRoute } from "@tanstack/react-router";

import { MazeEditPage } from "../../../../../pages/maze-detail";

export const Route = createFileRoute("/_student/mazes/$mazeId/edit")({
	component: RouteComponent,
});

function RouteComponent() {
	const { mazeId } = Route.useParams();
	return <MazeEditPage key={mazeId} mazeId={mazeId} />;
}
