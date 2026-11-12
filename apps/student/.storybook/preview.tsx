import "@mantine/core/styles.css";
import "../src/app/styles/fonts.css";
import { MantineProvider } from "@mantine/core";
import type { Preview } from "@storybook/react-vite";

import { theme } from "../src/app/theme";

// 画面と同じ見た目の基準（文字の大きさ・ボタンの高さ・フォント）で描く
const preview: Preview = {
	decorators: [
		(Story) => (
			<MantineProvider theme={theme}>
				<Story />
			</MantineProvider>
		),
	],
};

export default preview;
