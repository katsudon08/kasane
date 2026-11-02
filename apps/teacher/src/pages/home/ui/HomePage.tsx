import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { Button } from "../../../shared/ui/button";
import { Modal } from "../../../shared/ui/modal";

export function HomePage() {
	const [opened, { open, close }] = useDisclosure(false);

	return (
		<>
			<Button onClick={open}>モーダルを開く</Button>
			<Modal opened={opened} onClose={close}>
				<Text>モーダルの内容</Text>
			</Modal>
		</>
	);
}
