// つなぎ直すまでの待ち方（仕様書backend.mdの「再接続」）。どちらも、signalが中断されたらすぐ終わる
import { canReconnect } from "./reconnect";

export function canReconnectNow(): boolean {
	return canReconnect({ visibilityState: document.visibilityState, onLine: navigator.onLine });
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener("abort", done, { once: true });
	});
}

// 画面が見えていて、ネットワークにつながるまで待つ。見えるようになった・つながったら、すぐ終わる
export function waitUntilReconnectable(signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const check = () => {
			if (!signal.aborted && !canReconnectNow()) return;

			document.removeEventListener("visibilitychange", check);
			window.removeEventListener("online", check);
			signal.removeEventListener("abort", check);
			resolve();
		};
		document.addEventListener("visibilitychange", check);
		window.addEventListener("online", check);
		signal.addEventListener("abort", check);
		check();
	});
}
