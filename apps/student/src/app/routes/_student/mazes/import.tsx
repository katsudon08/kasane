import { createFileRoute } from "@tanstack/react-router";

import { MazeImportPage } from "../../../../pages/maze-import";

export const Route = createFileRoute("/_student/mazes/import")({
	component: MazeImportPage,
});
