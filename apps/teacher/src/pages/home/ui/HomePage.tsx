import { Paper, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation } from "@tanstack/react-query";

import { api } from "../../../shared/api";
import { Button } from "../../../shared/ui/button";
import { Loader } from "../../../shared/ui/loader";
import { Modal } from "../../../shared/ui/modal";
import { QRCode } from "../../../shared/ui/qrcode";
import { Text } from "../../../shared/ui/text";

export function HomePage() {
	const [opened, { open, close }] = useDisclosure(false);

	const createRoom = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.rooms.create.post();
			if (error) throw error;
			return data;
		},
	});

	const handleOpen = () => {
		open();
		if (createRoom.data || createRoom.isPending) return;
		createRoom.mutate();
	};

	return (
		<>
			<Button onClick={handleOpen}>
				{createRoom.data ? "QRコードをもう一度表示する" : "授業を始める"}
			</Button>
			<Modal
				opened={opened}
				onClose={close}
				size="md"
				title="児童にQRコードを読み取ってもらいましょう"
				styles={{ title: { fontWeight: 700 } }}
			>
				<Stack align="center" justify="center" style={{ height: 200 }}>
					{(createRoom.isIdle || createRoom.isPending) && <Loader size="xl" />}
					{createRoom.isError && (
						<>
							<Text fw={600} size="xl">
								授業を始められませんでした
							</Text>
							<Text ta="center">
								インターネットにつながっているか確認して、もう一度お試しください。
							</Text>
							<Button variant="outline" color="red" size="md" onClick={() => createRoom.mutate()}>
								もう一度試す
							</Button>
						</>
					)}
					{createRoom.isSuccess && (
						<Paper withBorder p="lg" style={{ borderWidth: 3 }}>
							<QRCode
								value={createRoom.data.id}
								fallback={
									<Stack align="center" gap="xs">
										<Text fw={600} size="xl">
											QRコードを表示できませんでした
										</Text>
										<Text ta="center">画面を更新してから、もう一度お試しください。</Text>
									</Stack>
								}
							/>
						</Paper>
					)}
				</Stack>
			</Modal>
		</>
	);
}
