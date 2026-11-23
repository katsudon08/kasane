/*
 * デスクトップアプリで開いたときの決まり（仕様書free-mode.mdの「デスクトップアプリ」）
 * - デスクトップアプリ（apps/desktop）は、児童用アプリのビルドを専用のアドレス（kasane://app/）で開く
 *   このアドレスの形（プロトコル）で、デスクトップアプリかを見分ける
 * - 起動すると/freeを開く。/freeの外のルートを開こうとしたら/freeへ移る
 */
const DESKTOP_PROTOCOL = "kasane:";

export function isDesktopProtocol(protocol: string): boolean {
	return protocol === DESKTOP_PROTOCOL;
}

// 自由モードの画面（/freeとその下）の外か
export function outsideFreeMode(pathname: string): boolean {
	return pathname !== "/free" && !pathname.startsWith("/free/");
}

// この画面がデスクトップアプリで開かれているか（アドレスの形は、開いている間に変わらない）
export function isDesktop(): boolean {
	return isDesktopProtocol(window.location.protocol);
}
