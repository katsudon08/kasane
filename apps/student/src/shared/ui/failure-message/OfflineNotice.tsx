/*
 * 通信できないときの文言と「もう一度」ボタン（仕様書README.mdの「授業に参加する」の失敗時の表示）
 * 参加の画面のほか、ホームなどで読み込めなかったときも同じ文言にする
 */
import { Button, Stack } from "@mantine/core";

import { FailureMessage } from "./FailureMessage";

type Props = {
	onRetry: () => void;
	// 押しても送れないとき（ニックネームが空など）
	disabled?: boolean;
};

export function OfflineNotice({ onRetry, disabled = false }: Props) {
	return (
		<Stack gap="md" align="flex-start">
			<FailureMessage>
				インターネットにつながっていません。もう
				<ruby>
					一度<rt>いちど</rt>
				</ruby>
				おしてね
			</FailureMessage>
			<Button onClick={onRetry} disabled={disabled}>
				もう
				<ruby>
					一度<rt>いちど</rt>
				</ruby>
			</Button>
		</Stack>
	);
}
