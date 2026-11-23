import { createFileRoute } from "@tanstack/react-router";

import { MazePlayPage } from "../../../../../pages/maze-detail";

export const Route = createFileRoute("/free/mazes/$mazeId/play")({
	component: RouteComponent,
});

function RouteComponent() {
	const { mazeId } = Route.useParams();
	return <MazePlayPage key={mazeId} mazeId={mazeId} />;
}
