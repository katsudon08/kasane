import type { Meta, StoryObj } from "@storybook/react-vite";

import { Loader } from "./Loader";

const meta = {
	title: "shared/ui/Loader",
	component: Loader,
	argTypes: {
		type: {
			control: "select",
			options: ["oval", "bars", "dots"],
		},
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "xl"],
		},
	},
} satisfies Meta<typeof Loader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
