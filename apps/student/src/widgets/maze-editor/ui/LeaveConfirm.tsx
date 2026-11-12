/*
 * 作っている途中で画面を離れようとしたときの確認（仕様書README.mdの「めいろをつくる / 変える」）
 * 安全な側（作り続ける）を青の塗りつぶしで強調し、押した結果が分かる言葉にする
 */
import { Button, Group, Modal, Stack, Text } from "@mantine/core";

type Props = {
	onLeave: () => void;
	onStay: () => void;
};

// 開いている間だけ描く
export function LeaveConfirm({ onLeave, onStay }: Props) {
	return (
		<Modal opened onClose={onStay} centered size="lg" withCloseButton={false}>
			<Stack gap="xl">
				<Text fw={700} size="lg">
					まだ
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					ができあがっていないよ。やめると、
					<ruby>
						今<rt>いま</rt>
					</ruby>
					の
					<ruby>
						形<rt>かたち</rt>
					</ruby>
					は
					<ruby>
						消<rt>き</rt>
					</ruby>
					えるよ
				</Text>
				<Group grow gap="sm">
					<Button variant="outline" onClick={onLeave}>
						<ruby>
							作<rt>つく</rt>
						</ruby>
						るのをやめる
					</Button>
					<Button onClick={onStay}>
						<ruby>
							作<rt>つく</rt>
						</ruby>
						り
						<ruby>
							続<rt>つづ</rt>
						</ruby>
						ける
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
}
