import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation } from "@tanstack/react-query";

import { api } from "../../../shared/api";
import { Button } from "../../../shared/ui/button";
import { Modal } from "../../../shared/ui/modal";

export function HomePage() {
	const [opened, { open, close }] = useDisclosure(false);

	const createRoom = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.rooms.create.post();
			if (error) throw error;
			return data;
		},
		onSuccess: (data) => console.log(data),
		onError: (error) => console.error(error),
	});

	const handleOpen = () => {
		open();
		if (createRoom.data || createRoom.isPending) return;
		createRoom.mutate();
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
