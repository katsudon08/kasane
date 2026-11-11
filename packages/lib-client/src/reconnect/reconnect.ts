// SSEのつなぎ直し（仕様書backend.mdの「再接続」）

// 固定の待ち時間。ここに0〜1秒のばらつきを足して、多くの端末が同時につなぎ直すのを少し散らす
const BASE_DELAY_MS = 3000;
const JITTER_MS = 1000;

// randomはMath.random()のような0以上1未満の数
export function reconnectDelayMs(random: number): number {
	return BASE_DELAY_MS + random * JITTER_MS;
}

type ReconnectConditions = {
	visibilityState: DocumentVisibilityState;
	onLine: boolean;
};

// 画面が見えていない間と、ネットワークにつながっていない間はつなぎ直さない
export function canReconnect({ visibilityState, onLine }: ReconnectConditions): boolean {
	return visibilityState === "visible" && onLine;
}
