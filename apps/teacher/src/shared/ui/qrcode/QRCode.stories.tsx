import { Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { QRCode } from "./QRCode";

const meta = {
	title: "shared/ui/QRCode",
	component: QRCode,
	args: {
		value: "https://example.com",
		fallback: <Text>QRコードを表示できません</Text>,
	},
} satisfies Meta<typeof QRCode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: {
		value: "",
	},
};
