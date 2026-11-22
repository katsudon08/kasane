/*
 * 画面のアドレスのパスから、返す児童用アプリのファイルを決める（仕様書free-mode.mdの「デスクトップアプリ」）
 * - 画面のルート（拡張子のないパス。/free、/free/tutorials/1など）にはindex.htmlを返し、画面の中でルートを切り替える
 * - ファイル（拡張子のあるパス）は、%で書かれた文字をもとに戻して、ビルドの中から探す
 * - ビルドの外を指すパス・正しくない%の書き方・ヌル文字を含むパスにはnullを返す
 */
import { isAbsolute, join, posix, relative, resolve } from "node:path";

export function appFilePath(root: string, pathname: string): string | null {
	let decoded: string;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		// 正しくない%の書き方
		return null;
	}
	if (decoded.includes("\0")) return null;

	if (!posix.basename(decoded).includes(".")) return join(root, "index.html");

	const file = resolve(root, `.${decoded}`);
	const fromRoot = relative(root, file);
	if (fromRoot === "" || fromRoot.startsWith("..") || isAbsolute(fromRoot)) return null;
	return file;
}
