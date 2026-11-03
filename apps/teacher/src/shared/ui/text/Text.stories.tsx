import type { Meta, StoryObj } from "@storybook/react-vite";

import { Text } from "./Text";

const meta = {
	title: "shared/ui/Text",
	component: Text,
	args: {
		children: "テキスト",
	},
	argTypes: {
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "xl"],
		},
	},
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
