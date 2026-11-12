import { createFileRoute } from "@tanstack/react-router";

import { EndedPage } from "../../pages/ended";

export const Route = createFileRoute("/ended")({
	component: EndedPage,
});
