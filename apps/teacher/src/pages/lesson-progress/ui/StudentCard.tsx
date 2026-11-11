/*
 * 進み具合の児童カード（仕様書README.mdの「進み具合」の表）
 * 名前・進み・今の問題の結果を出す。状態が変わっていない児童は再描画しないよう、
 * 状態を値（文字列と数）で受け取ってmemoで包む（backend.mdの「フロントエンド共通」）
 */
import { TUTORIALS } from "@kasane/core";
import { Card, Group, Progress, Stack } from "@mantine/core";
import { CircleCheck, CircleMinus, CircleX, Star } from "lucide-react";
import { memo } from "react";

import { tutorialProgress, type StudentStatus } from "../../../entities/lesson";
import { Text } from "../../../shared/ui/text";

type Props = {
	name: string;
	clearedCount: number;
	lastResult: StudentStatus["lastResult"];
};

// 状態は色だけで伝えず、アイコンの形も変える（仕様書README.mdの「見た目と操作のルール」）
const RESULTS = {
	notSent: { label: "まだ送っていない", color: "gray.7", Icon: CircleMinus },
	succeeded: { label: "成功", color: "green.8", Icon: CircleCheck },
	failed: { label: "失敗", color: "red.8", Icon: CircleX },
} as const;

export const StudentCard = memo(function StudentCard({ name, clearedCount, lastResult }: Props) {
	const progress = tutorialProgress(clearedCount, TUTORIALS.length);
	const result = RESULTS[lastResult];

	return (
		<Card withBorder padding="lg" radius="md">
			<Stack gap="sm">
				{/* 名前は利用者の入力なので、テキストとして描く。20文字の名前でもカードからはみ出さないよう折り返す */}
				<Text fz={28} fw={700} style={{ overflowWrap: "anywhere" }}>
					{name}
				</Text>
				{progress.allCleared ? (
					<Group gap="xs" c="yellow.7" wrap="nowrap">
						<Star fill="currentColor" aria-hidden />
						<Text c="dark" fw={700}>
							チュートリアルをすべてクリア
						</Text>
					</Group>
				) : (
					<Stack gap={4}>
						<Text>{progress.label}</Text>
						<Progress value={progress.percent} size="lg" aria-label={progress.label} />
					</Stack>
				)}
				<Group gap="xs" c={result.color} wrap="nowrap">
					<result.Icon aria-hidden />
					<Text fw={700}>{result.label}</Text>
				</Group>
			</Stack>
		</Card>
	);
});
