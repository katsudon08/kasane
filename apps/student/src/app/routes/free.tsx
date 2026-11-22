/*
 * 自由モードの画面を包むレイアウト（仕様書free-mode.mdの「画面遷移」）
 * - 下の画面に自由モードであることを伝え、記録の読み書きをlocalStorageに、移り先を/freeの下にする
 * - 児童のトークンを見ず、GET /me/eventsにもつながない
 * - 描画中の例外は、ここで受け止める（README.mdの「うまく動かなかったときの受け止め」）
 */
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { ErrorPage } from "../../pages/error";
import { StudentModeProvider } from "../../shared/lib/student-mode";

export const Route = createFileRoute("/free")({
	component: FreeLayout,
	errorComponent: ErrorPage,
});

function FreeLayout() {
	return (
		<StudentModeProvider mode="free">
			<Outlet />
		</StudentModeProvider>
	);
}
