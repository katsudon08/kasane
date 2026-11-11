/*
 * 児童画面の見た目の基準（仕様書README.mdの「見た目と操作のルール」「文言のルール」）
 * - 基調は青と白
 * - 文字は最低20px、タップできる部分は最低64px四方
 * - ルビのぶん行が高くなるので、ボタンや入力欄の高さはルビ込みで決める（部品の既定の高さに任せない）
 */
import { ActionIcon, Button, TextInput, createTheme, rem } from "@mantine/core";

/*
 * 行の高さは、ルビを除いた本文だけで決める
 * ルビの読みは、ブラウザーが行の上に足して行を高くする。行の高さを大きく取ると、読みは上の余白に収まり、下にだけ余白が残って上下がそろわない
 */
const LINE_HEIGHT = "1.4";
// ボタンの文言は1行なので、本文の下の余白も詰めて、読みを含めた文字をボタンの上下の真ん中に置く
const BUTTON_LINE_HEIGHT = "1.1";
const MIN_TAP_SIZE = rem(64);

export const theme = createTheme({
	primaryColor: "blue",
	fontSizes: { xs: rem(20), sm: rem(20), md: rem(22), lg: rem(26), xl: rem(30) },
	lineHeights: {
		xs: LINE_HEIGHT,
		sm: LINE_HEIGHT,
		md: LINE_HEIGHT,
		lg: LINE_HEIGHT,
		xl: LINE_HEIGHT,
	},
	headings: {
		sizes: {
			h1: { fontSize: rem(34), lineHeight: LINE_HEIGHT },
			h2: { fontSize: rem(28), lineHeight: LINE_HEIGHT },
			h3: { fontSize: rem(24), lineHeight: LINE_HEIGHT },
		},
	},
	components: {
		Button: Button.extend({
			defaultProps: { size: "xl" },
			styles: {
				root: { height: "auto", minHeight: MIN_TAP_SIZE, paddingBlock: rem(10) },
				/*
				 * 部品の既定は、文言の箱を本文の字の上端（cap）と下端（baseline）で切り詰める（text-box-trim）
				 * それだとルビの読みが箱の外に出て、ボタンの高さに入らないので、切り詰めない
				 * また、既定は文言をflexで並べ、ルビのある字とない字をそれぞれ上下の真ん中に置くので、字の下端がずれる
				 * ふつうの文の流れにして、字の下端をそろえる
				 */
				label: {
					textBoxTrim: "none",
					display: "block",
					height: "auto",
					overflow: "visible",
					lineHeight: BUTTON_LINE_HEIGHT,
				},
			},
		}),
		TextInput: TextInput.extend({
			defaultProps: { size: "xl" },
			styles: {
				label: { lineHeight: LINE_HEIGHT },
				input: { minHeight: MIN_TAP_SIZE },
			},
		}),
		ActionIcon: ActionIcon.extend({
			defaultProps: { size: MIN_TAP_SIZE },
		}),
	},
});
