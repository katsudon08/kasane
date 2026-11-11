/*
 * ルビ付きの文言（仕様書README.mdの「文言のルール」、backend.mdの「トークン」）
 * packages/coreのRubyText（チュートリアルの名前など）を、<ruby>と<rt>の要素で組む。HTML文字列にしない
 * 画面に直接書く文言は、この部品を使わずにJSXの<ruby>で書く
 */
import type { RubyText as RubyTextValue } from "@kasane/core";

type Props = { value: RubyTextValue };

export function RubyText({ value }: Props) {
	return value.map(({ text, ruby }, index) =>
		ruby === undefined ? (
			text
		) : (
			// 文言は定数で並びが変わらないので、位置をkeyにする
			<ruby key={index}>
				{text}
				<rt>{ruby}</rt>
			</ruby>
		),
	);
}
