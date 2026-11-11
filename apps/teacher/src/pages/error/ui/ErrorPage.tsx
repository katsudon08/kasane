/*
 * 描画中の例外を受け止める画面（仕様書README.mdの「うまく動かなかったときの受け止め」の教師）
 * 想定内の失敗（通信できない・授業が終わった）はここに来ず、それぞれの画面で文言を出す
 */
import { Center, Stack, Title } from "@mantine/core";

import { Button } from "../../../shared/ui/button";

export function ErrorPage() {
	return (
		<Center h="100dvh">
			<Stack align="center" gap="lg">
				<Title order={1}>問題が起きました。ページを読み込み直してください</Title>
				<Button size="xl" onClick={() => window.location.reload()}>
					読み込み直す
				</Button>
			</Stack>
		</Center>
	);
}
