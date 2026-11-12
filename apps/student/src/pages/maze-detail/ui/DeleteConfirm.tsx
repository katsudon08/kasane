/*
 * 「この迷路を消す」の確認（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * 安全な側（残す）を青の塗りつぶしで強調し、押した結果が分かる言葉にする（「カードを全部消す」の確認と同じ形）
 * 通信できなかったときは、モーダルを開いたまま文言を出し、もう一度押してもらう
 */
import { Button, Group, Modal, Stack, Text } from "@mantine/core";

import { FailureMessage } from "../../../shared/ui/failure-message";

type Props = {
	deleting: boolean;
	offline: boolean;
	onDelete: () => void;
	onCancel: () => void;
};

// 開いている間だけ描く
export function DeleteConfirm({ deleting, offline, onDelete, onCancel }: Props) {
	return (
		<Modal opened onClose={onCancel} centered size="lg" withCloseButton={false}>
			<Stack gap="xl">
				<Text fw={700} size="lg">
					この
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					を
					<ruby>
						消<rt>け</rt>
					</ruby>
					すと、
					<ruby>
						元<rt>もと</rt>
					</ruby>
					にもどせないよ
				</Text>
				{offline && (
					<FailureMessage>
						インターネットにつながっていません。もう
						<ruby>
							一度<rt>いちど</rt>
						</ruby>
						おしてね
					</FailureMessage>
				)}
				<Group grow gap="sm">
					<Button variant="outline" onClick={onDelete} loading={deleting}>
						<ruby>
							迷路<rt>めいろ</rt>
						</ruby>
						を
						<ruby>
							消<rt>け</rt>
						</ruby>
						す
					</Button>
					<Button onClick={onCancel}>
						<ruby>
							迷路<rt>めいろ</rt>
						</ruby>
						を
						<ruby>
							残<rt>のこ</rt>
						</ruby>
						す
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
}
