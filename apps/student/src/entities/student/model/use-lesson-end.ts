/*
 * 授業の終わりを待つ受け取り口に、一つだけつなぐ
 * パスなしレイアウトで呼び、画面を移っても接続を持ち越す（仕様書README.mdの「画面遷移」の児童）
 */
import { useEffect } from "react";

import type { StudentAccessLostReason } from "../../../shared/api";
import { watchLessonEnd } from "./watch-lesson-end";

// onLostは、授業を続けられなくなったときに一度だけ呼ばれる。変わるたびにつなぎ直すので、useCallbackなどで保つ
export function useLessonEnd(onLost: (reason: StudentAccessLostReason) => void): void {
	useEffect(() => {
		// レイアウトを離れたら（参加し直す・授業がおわりましたへ移る）接続を切る
		const controller = new AbortController();
		void watchLessonEnd(controller.signal, onLost);
		return () => controller.abort();
	}, [onLost]);
}
