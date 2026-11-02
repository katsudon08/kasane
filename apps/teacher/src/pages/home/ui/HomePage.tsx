import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { api } from "../../../shared/api";
import { Button } from "../../../shared/ui/button";
import { Modal } from "../../../shared/ui/modal";

export function HomePage() {
	const [opened, { open, close }] = useDisclosure(false);

	const handleOpen = async () => {
		open();
		const { data, error } = await api.rooms.create.post();
		console.log({ data, error });
	};

	return (
		<>
			<Button onClick={handleOpen}>モーダルを開く</Button>
			<Modal opened={opened} onClose={close}>
				<Text>モーダルの内容</Text>
			</Modal>
		</>
	);
}
