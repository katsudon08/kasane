import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ErrorPage } from "./pages/error";
import { routeTree } from "./routeTree.gen";

// どのルートで例外が起きても、同じ受け止めの画面を出す
const router = createRouter({ routeTree, defaultErrorComponent: ErrorPage });

const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// 参照ドキュメント: https://ja.react.dev/reference/react-dom/client/createRoot
const root = createRoot(document.getElementById("root")!);
root.render(
	<StrictMode>
		<MantineProvider>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</MantineProvider>
	</StrictMode>,
);
