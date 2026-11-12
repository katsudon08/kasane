/*
 * 終わった授業（他人の授業・存在しない授業も含む）を開いたときの表示（仕様書README.mdの「QRコードを見せる」「進み具合」）
 * 「この授業は終わっています」と、ホームへ戻るボタンを出す
 */
import { Center, Stack, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "../../../shared/ui/button";

export function LessonEndedNotice() {
	const navigate = useNavigate();

	return (
		<Center h="100dvh">
			<Stack align="center" gap="lg">
				<Title order={1}>この授業は終わっています</Title>
				<Button size="xl" onClick={() => void navigate({ to: "/" })}>
					ホームへ戻る
				</Button>
			</Stack>
		</Center>
	);
}
