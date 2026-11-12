/*
 * /joinと/ended以外の児童の画面を包む、パスなしのレイアウト（仕様書README.mdの「画面遷移」の児童）
 * - 児童のトークンが端末になければ/joinへ移る
 * - 児童用のSSE（GET /me/events）に一つだけつなぎ、画面を移っても接続を持ち越す
 * - つなげない（401）なら/joinへ、授業が終わった（410・ended）なら/endedへ移る
 * - 描画中の例外は、ここで受け止める（README.mdの「うまく動かなかったときの受け止め」）
 */
import { Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useLessonEnd } from "../../entities/student";
import { ErrorPage } from "../../pages/error";
import { hasStudentToken } from "../../shared/api";
import type { StudentAccessLostReason } from "../../shared/api";

export const Route = createFileRoute("/_student")({
	beforeLoad: () => {
		if (!hasStudentToken()) throw redirect({ to: "/join", replace: true });
	},
	component: StudentLayout,
	errorComponent: ErrorPage,
});

function StudentLayout() {
	const navigate = useNavigate();
	const leave = useCallback(
		(reason: StudentAccessLostReason) => {
			// 作っている途中の迷路があっても、確認を出さずに移る（授業を続けられないので）
			void navigate({
				to: reason === "lessonEnded" ? "/ended" : "/join",
				replace: true,
				ignoreBlocker: true,
			});
		},
		[navigate],
	);
	useLessonEnd(leave);

	return <Outlet />;
}
