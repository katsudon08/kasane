/*
 * 児童が入れる名前（仕様書backend.mdの「入力の上限」の名前・迷路の名前）
 * ニックネームと迷路の名前は、どちらも前後の空白を削って1〜20文字、改行と制御文字は使えない
 */

export const NAME_MAX_LENGTH = 20;

/*
 * 改行と制御文字（APIの入力と同じ範囲）。教師のカードの表示を崩さないため、サーバーも弾く
 * どれも1つの文字コード（UTF-16の1単位）に収まるので、単位ごとに見ればよい
 */
function isControlCode(code: number): boolean {
	return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029;
}

function hasControlCharacter(text: string): boolean {
	for (let index = 0; index < text.length; index++) {
		if (isControlCode(text.charCodeAt(index))) return true;
	}
	return false;
}

// 前後の空白を削って送れる名前を返す。空・長すぎる・改行や制御文字があるときはnull
export function nameOf(input: string): string | null {
	const name = input.trim();
	if (name.length === 0 || name.length > NAME_MAX_LENGTH) return null;
	if (hasControlCharacter(name)) return null;

	return name;
}
