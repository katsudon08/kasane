import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Button } from "../button";
import { Modal } from "./Modal";

const meta = {
	title: "shared/ui/Modal",
	component: Modal,
	args: {
		opened: false,
		onClose: fn(),
		title: "タイトル",
	},
	render: function Render(args) {
		const [opened, { open, close }] = useDisclosure(false);

		return (
			<>
				<Button onClick={open}>モーダルを開く</Button>
				<Modal
					{...args}
					opened={opened}
					onClose={() => {
						close();
					}}
				>
					<Text>モーダルの内容</Text>
				</Modal>
			</>
		);
	},
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NotCentered: Story = {
	args: {
		centered: false,
	},
};
