/*
 * 児童画面の見た目の基準（仕様書README.mdの「見た目と操作のルール」「文言のルール」）
 * - 基調は青と白
 * - 文字は最低20px、タップできる部分は最低64px四方
 * - ルビのぶん行が高くなるので、行の高さ・ボタンや入力欄の高さはルビ込みで決める（部品の既定の高さに任せない）
 */
import { ActionIcon, Button, TextInput, createTheme, rem } from "@mantine/core";

// ルビ（文字の半分の大きさ）を上に置いても、上の行や枠にはみ出さない行の高さ
const LINE_HEIGHT_WITH_RUBY = "2";
const MIN_TAP_SIZE = rem(64);

export const theme = createTheme({
	primaryColor: "blue",
	fontSizes: { xs: rem(20), sm: rem(20), md: rem(22), lg: rem(26), xl: rem(30) },
	lineHeights: {
		xs: LINE_HEIGHT_WITH_RUBY,
		sm: LINE_HEIGHT_WITH_RUBY,
		md: LINE_HEIGHT_WITH_RUBY,
		lg: LINE_HEIGHT_WITH_RUBY,
		xl: LINE_HEIGHT_WITH_RUBY,
	},
	headings: {
		sizes: {
			h1: { fontSize: rem(34), lineHeight: LINE_HEIGHT_WITH_RUBY },
			h2: { fontSize: rem(28), lineHeight: LINE_HEIGHT_WITH_RUBY },
			h3: { fontSize: rem(24), lineHeight: LINE_HEIGHT_WITH_RUBY },
		},
	},
	components: {
		Button: Button.extend({
			defaultProps: { size: "xl" },
			styles: {
				root: { height: "auto", minHeight: MIN_TAP_SIZE, paddingBlock: rem(6) },
				label: { overflow: "visible", lineHeight: LINE_HEIGHT_WITH_RUBY },
			},
		}),
		TextInput: TextInput.extend({
			defaultProps: { size: "xl" },
			styles: {
				label: { lineHeight: LINE_HEIGHT_WITH_RUBY },
				input: { minHeight: MIN_TAP_SIZE },
			},
		}),
		ActionIcon: ActionIcon.extend({
			defaultProps: { size: MIN_TAP_SIZE },
		}),
	},
});
