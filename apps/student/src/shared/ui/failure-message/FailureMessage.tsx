/*
 * 失敗の文言（仕様書README.mdの「文言のルール」「見た目と操作のルール」）
 * 何が起きたかと次にどうするかを、色だけでなくアイコンも添えて出す
 */
import { Group, Text } from "@mantine/core";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

export function FailureMessage({ children }: Props) {
	return (
		<Group role="alert" gap="sm" wrap="nowrap" c="red.8">
			<CircleAlert aria-hidden size={32} style={{ flexShrink: 0 }} />
			<Text c="red.8" fw={700}>
				{children}
			</Text>
		</Group>
	);
}
