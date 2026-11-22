/*
 * 自由モードの画面を包むレイアウト（仕様書free-mode.mdの「画面遷移」）
 * - 児童のトークンを見ず、GET /me/eventsにもつながない
 * - 描画中の例外は、ここで受け止める（README.mdの「うまく動かなかったときの受け止め」）
 * 自由モードの画面（ホーム・しょうさい・プレイ・迷路）は、plan.mdのタスク21でこの下に置く
 */
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { ErrorPage } from "../../pages/error";

export const Route = createFileRoute("/free")({
	component: Outlet,
	errorComponent: ErrorPage,
});
