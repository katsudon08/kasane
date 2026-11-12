/*
 * もんだいのしょうさい（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * 見出しは「{番号}. {名前}」、左に「もどる」の矢印（ホームへ）
 * 番号が正しくない・まだ解けない問題（isTutorialUnlockedが偽）なら、ホームへ移る。チュートリアルは定数なので通信しない
 * 画面の大部分に迷路の3D。その下に主ボタン「この迷路で遊ぶ」
 */
import { ActionIcon, Button, Container, Group, Stack, Title } from "@mantine/core";
import { Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { MazeScene } from "../../../entities/maze";
import { OfflineNotice } from "../../../shared/ui/failure-message";
import { RubyText } from "../../../shared/ui/ruby-text";
import { useTutorial } from "../model/use-tutorial";

type Props = {
	// URLの$noの値
	noParam: string;
};

export function TutorialDetailPage({ noParam }: Props) {
	const access = useTutorial(noParam);

	if (access.kind === "home") return <Navigate to="/" replace />;
	if (access.kind === "hidden") return null;
	if (access.kind === "offline") {
		return (
			<Container size="lg" py="xl">
				<OfflineNotice onRetry={access.retry} />
			</Container>
		);
	}

	const { tutorial } = access;
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
				<MazeScene maze={tutorial.maze} />
				<Group>
					<Button
						renderRoot={(props) => (
							<Link to="/tutorials/$no/play" params={{ no: String(tutorial.no) }} {...props} />
						)}
					>
						この
						<ruby>
							迷路<rt>めいろ</rt>
						</ruby>
						で
						<ruby>
							遊<rt>あそ</rt>
						</ruby>
						ぶ
					</Button>
				</Group>
			</Stack>
		</Container>
	);
}
