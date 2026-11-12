/*
 * 迷路の名前の初期値（仕様書README.mdの「めいろをつくる / 変える」）
 * 「めいろ1」のように、自分の迷路の名前と重ならないいちばん小さい番号を付ける
 * 保存される文字列なので、ルビは付けない
 */
const PREFIX = "めいろ";

export function defaultMazeName(names: readonly string[]): string {
	const used = new Set(names);
	let number = 1;
	while (used.has(`${PREFIX}${number}`)) number += 1;
	return `${PREFIX}${number}`;
}
