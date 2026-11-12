/*
 * もんだいのプレイ（仕様書README.mdの「プレイ」の/tutorials/$no/play）
 * 見出しはしょうさい画面と同じ「{番号}. {名前}」。左の「もどる」の矢印で、しょうさいへ戻る
 * 遊んでよい問題かは、しょうさいと同じ決まりで確かめる
 */
import { ActionIcon, Container, Group, Title } from "@mantine/core";
import { Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { OfflineNotice } from "../../../shared/ui/failure-message";
import { RubyText } from "../../../shared/ui/ruby-text";
import { PlayScreen } from "../../../widgets/play-screen";
import { useTutorial } from "../model/use-tutorial";

type Props = {
	// URLの$noの値
	noParam: string;
};

export function TutorialPlayPage({ noParam }: Props) {
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
		<PlayScreen
			target={{ kind: "tutorial", no: tutorial.no }}
			maze={tutorial.maze}
			maxCards={tutorial.maxCards}
			header={
				<Group gap="sm" wrap="nowrap">
					<ActionIcon
						renderRoot={(props) => (
							<Link to="/tutorials/$no" params={{ no: String(tutorial.no) }} {...props} />
						)}
						variant="subtle"
						aria-label="問題のしょうさいにもどる"
					>
						<ChevronLeft aria-hidden size={40} />
					</ActionIcon>
					<Title order={1}>
						{tutorial.no}. <RubyText value={tutorial.name} />
					</Title>
				</Group>
			}
		/>
	);
}
