import "@mantine/core/styles.css";
import "./app/styles/fonts.css";
import { MantineProvider } from "@mantine/core";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { theme } from "./app/theme";
import { ErrorPage } from "./pages/error";
import { routeTree } from "./routeTree.gen";
import { StudentAccessLost } from "./shared/api";
import { serveQrWasmFromSelf } from "./shared/lib/qr-wasm";

// どの画面でQRを読み取るときも、WASMを外部から読み込まない
serveQrWasmFromSelf();

/*
 * 描画中の例外は、パスなしレイアウト（/joinと/ended以外）で受け止める（仕様書README.mdの「うまく動かなかったときの受け止め」）
 * /joinと/endedで起きたときも、ライブラリの既定の英語の画面ではなく、同じ受け止めの画面を出す
 */
const router = createRouter({ routeTree, defaultErrorComponent: ErrorPage });

/*
 * どの操作でも、本人を特定できない（401）なら/joinへ、授業が終わっている（410）なら/endedへ移る
 * SSEで終わりを受け取れなかった端末も、次に操作したときに/endedへ移る（仕様書README.mdの「画面遷移」の児童）
 */
function leaveLessonOn(error: unknown): void {
	if (!(error instanceof StudentAccessLost)) return;
	// 作っている途中の迷路があっても、確認を出さずに移る（授業を続けられないので）
	void router.navigate({
		to: error.reason === "lessonEnded" ? "/ended" : "/join",
		replace: true,
		ignoreBlocker: true,
	});
}

const MAX_RETRIES = 3;

const queryClient = new QueryClient({
	queryCache: new QueryCache({ onError: leaveLessonOn }),
	mutationCache: new MutationCache({ onError: leaveLessonOn }),
	defaultOptions: {
		queries: {
			// 授業を続けられないときは、何度試しても同じなので試し直さない
			retry: (failureCount, error) =>
				!(error instanceof StudentAccessLost) && failureCount < MAX_RETRIES,
		},
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// 参照ドキュメント: https://ja.react.dev/reference/react-dom/client/createRoot
const root = createRoot(document.getElementById("root")!);
root.render(
	<StrictMode>
		<MantineProvider theme={theme}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</MantineProvider>
	</StrictMode>,
);
