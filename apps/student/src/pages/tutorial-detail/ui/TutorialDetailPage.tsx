/*
 * もんだいのしょうさい（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * 見出しは「{番号}. {名前}」、左に「もどる」の矢印（ホームへ）
 * 番号が正しくない・まだ解けない問題（isTutorialUnlockedが偽）なら、ホームへ移る。チュートリアルは定数なので通信しない
 * 迷路の3Dと「この迷路で遊ぶ」は、タスク11・12で足す
 */
import { isTutorialUnlocked } from "@kasane/core";
import { ActionIcon, Container, Group, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { meQueries } from "../../../entities/student";
import { OfflineNotice } from "../../../shared/ui/failure-message";
import { RubyText } from "../../../shared/ui/ruby-text";
import { tutorialOf } from "../lib/tutorial-of";

type Props = {
	// URLの$noの値
	noParam: string;
};

export function TutorialDetailPage({ noParam }: Props) {
	const tutorial = tutorialOf(noParam);
	// クリア数はホームで読み込んだGET /meのキャッシュから読む
	const me = useQuery(meQueries.me());

	if (tutorial === null) return <Navigate to="/" replace />;
	if (me.isPending) return null;
	if (me.isError) {
		return (
			<Container size="lg" py="xl">
				<OfflineNotice onRetry={() => void me.refetch()} />
			</Container>
		);
	}
	if (!isTutorialUnlocked(tutorial.no, me.data.clearedCount)) return <Navigate to="/" replace />;

	return (
		<Container size="lg" py="xl">
			<Stack gap="lg">
				<Group gap="sm" wrap="nowrap">
					<ActionIcon
						renderRoot={(props) => <Link to="/" {...props} />}
						variant="subtle"
						aria-label="ホームにもどる"
					>
						<ChevronLeft aria-hidden size={40} />
					</ActionIcon>
					<Title order={1}>
						{tutorial.no}. <RubyText value={tutorial.name} />
					</Title>
				</Group>
			</Stack>
		</Container>
	);
}
