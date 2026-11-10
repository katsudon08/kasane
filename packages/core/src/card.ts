/*
 * 命令カードの型・QRの読み取り（仕様書domain.mdの「命令カード」）
 */

export type CardType = "forward" | "right" | "left" | "fill" | "repeat" | "end";

export type Card = { type: CardType };

// QRの中身とカードの対応
const CARD_TYPES: Readonly<Record<string, CardType>> = {
	FORWARD: "forward",
	RIGHT: "right",
	LEFT: "left",
	HOLE: "fill",
	LOOP: "repeat",
	END: "end",
};

// 読み取った文字列の前後の空白を取り、表と比べる。合わなければnull（KASANEのカードでない）
export function parseCard(text: string): Card | null {
	const type = CARD_TYPES[text.trim()];
	return type === undefined ? null : { type };
}

// 同じ中身のQRを1回分として受け付ける間隔。ProgPathの学校での実証と同じ値
export const SCAN_INTERVAL_MS = 1500;

/*
 * 同じ中身のQRが最後に見えてから1500ms以上たっていれば受け付ける
 * lastSeenAtはQRの中身ごとの最後に見えた時刻。読み取るたびに呼び出し側がlastSeenAt[text] = nowに更新する
 */
export function isNewScan(
	text: string,
	now: number,
	lastSeenAt: Readonly<Record<string, number>>,
): boolean {
	const last = lastSeenAt[text];
	return last === undefined || now - last >= SCAN_INTERVAL_MS;
}
