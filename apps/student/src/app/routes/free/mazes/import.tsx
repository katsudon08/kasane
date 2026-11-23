import { createFileRoute } from "@tanstack/react-router";

import { MazeImportPage } from "../../../../pages/maze-import";

export const Route = createFileRoute("/free/mazes/import")({
	component: MazeImportPage,
});
