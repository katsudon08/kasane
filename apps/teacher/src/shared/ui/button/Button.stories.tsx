import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Button } from "./Button";

const meta = {
	title: "shared/ui/Button",
	component: Button,
	args: {
		children: "ボタン",
		onClick: fn(),
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["filled", "light", "outline", "subtle", "default", "transparent", "white"],
		},
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "xl"],
		},
	},
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const Loading: Story = {
	args: {
		loading: true,
	},
};
