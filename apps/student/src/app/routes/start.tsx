import { createFileRoute } from "@tanstack/react-router";

import { StartPage } from "../../pages/start";

export const Route = createFileRoute("/start")({
	component: StartPage,
});
