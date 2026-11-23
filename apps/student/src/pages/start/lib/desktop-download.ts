/*
 * 入口のダウンロードのボタンが指す先（仕様書free-mode.mdの「入口」「配布」）
 * WindowsかMacのときだけ返し、それ以外（iPad・Chromebook・スマートフォン）はnullにしてボタンを出さない
 * iPadのSafariはMacと名乗るので、タッチできる端末はMacとみなさない
 */
const RELEASES = "https://github.com/katsudon08/kasane/releases/latest/download";

// 端末の名乗りとタッチの数（ブラウザーのnavigatorをそのまま渡せる形）
type Device = { userAgent: string; maxTouchPoints: number };

export function desktopDownloadUrl({ userAgent, maxTouchPoints }: Device): string | null {
	if (userAgent.includes("Windows NT")) return `${RELEASES}/KASANE-Setup.exe`;
	if (userAgent.includes("Macintosh") && maxTouchPoints === 0) return `${RELEASES}/KASANE.dmg`;
	return null;
}
