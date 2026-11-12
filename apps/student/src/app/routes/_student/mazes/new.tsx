import { createFileRoute } from "@tanstack/react-router";

import { MazeNewPage } from "../../../../pages/maze-new";

export const Route = createFileRoute("/_student/mazes/new")({
	component: MazeNewPage,
});
