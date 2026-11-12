/*
 * 元にもどせない操作の前の確認（仕様書README.mdの「めいろをつくる / 変える」の確認のモーダル。
 * 「カードを全部消す」「この迷路を消す」も同じ形にする）
 * - 安全な側を右に置き、青の塗りつぶしで強調する。もどせない側は左に枠だけで置く
 * - どちらのボタンも、押した結果が分かる言葉にする（「はい」「いいえ」は使わない）
 * - 文は中央にそろえ、ボタンの文言が途中で折り返さない幅にする
 */
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

import classes from "./ConfirmDialog.module.css";

type Props = {
	message: ReactNode;
	// 元にもどせない側（左・枠だけ）
	actionLabel: ReactNode;
	onAction: () => void;
	// 安全な側（右・青の塗りつぶし）
	safeLabel: ReactNode;
	onSafe: () => void;
	// 元にもどせない側を実行している間
	acting?: boolean;
	// 失敗したときの文言など、文とボタンの間に出すもの
	children?: ReactNode;
};

// 開いている間だけ描く
export function ConfirmDialog({ onSafe, ...rest }: Props) {
	return (
		<Modal
			opened
			onClose={onSafe}
			centered
			size={640}
			padding="xl"
			radius="lg"
			withCloseButton={false}
		>
			<ConfirmContent onSafe={onSafe} {...rest} />
		</Modal>
	);
}

// 確認の中身（文とボタン）。他のモーダルの中で、確認から次の手順へ切り替えるときにも使う
export function ConfirmContent({
	message,
	actionLabel,
	onAction,
	safeLabel,
	onSafe,
	acting = false,
	children,
}: Props) {
	return (
		<Stack gap="xl" py="md">
			<Text fw={700} size="lg" className={classes.message}>
				{message}
			</Text>
			{children}
			<Group grow gap="md" wrap="nowrap">
				<Button variant="outline" size="lg" onClick={onAction} loading={acting}>
					{actionLabel}
				</Button>
				<Button size="lg" onClick={onSafe}>
					{safeLabel}
				</Button>
			</Group>
		</Stack>
	);
}
