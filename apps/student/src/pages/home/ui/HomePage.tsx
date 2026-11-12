/*
 * ホーム（仕様書README.mdの「ホーム」）
 * 上部に名前、「問題」にチュートリアルのカードと「問題を飛ばす」、「自分の迷路」に自分が作った迷路を出す
 * チュートリアルはpackages/coreの定数なので通信せず、クリア数だけをGET /meから取る
 */
import { TUTORIALS, canCreateMaze } from "@kasane/core";
import { Container, Group, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { meQueries } from "../../../entities/student";
import { StudentAccessLost } from "../../../shared/api";
import { OfflineNotice } from "../../../shared/ui/failure-message";
import { tutorialCardState } from "../lib/tutorial-card-state";
import { MyMazes } from "./MyMazes";
import { SkipTutorials } from "./SkipTutorials";
import { TutorialCard } from "./TutorialCard";

import classes from "./HomePage.module.css";

export function HomePage() {
	const me = useQuery(meQueries.me());

	// 読み込み中は何も出さない（児童画面の動きを3か所に絞るため、回る印も出さない）
	// 授業を続けられないとき（401・410）は、/joinか/endedへ移るので何も出さない
	if (me.isPending || me.error instanceof StudentAccessLost) return null;
	if (me.isError) {
		return (
			<Container size="lg" py="xl">
				<OfflineNotice onRetry={() => void me.refetch()} />
			</Container>
		);
	}

	const { name, clearedCount } = me.data;
	return (
		<Container size="lg" py="xl">
			<Stack gap="xl">
				{/* 児童が入れた名前は、テキストとして描く */}
				<Title order={1}>{name}</Title>

				<Stack gap="sm" component="section">
					{/* 見出しの行の右端に「問題を飛ばす」を置く。全部クリアしたら出さない */}
					<Group justify="space-between" wrap="nowrap">
						<Title order={2}>
							<ruby>
								問題<rt>もんだい</rt>
							</ruby>
						</Title>
						{clearedCount < TUTORIALS.length && <SkipTutorials clearedCount={clearedCount} />}
					</Group>
					<div className={classes.tutorials}>
						{TUTORIALS.map((tutorial) => (
							<TutorialCard
								key={tutorial.no}
								tutorial={tutorial}
								state={tutorialCardState(tutorial.no, clearedCount)}
							/>
						))}
					</div>
				</Stack>

				<Stack gap="sm" component="section">
					<Title order={2}>
						<ruby>
							自分<rt>じぶん</rt>
						</ruby>
						の
						<ruby>
							迷路<rt>めいろ</rt>
						</ruby>
					</Title>
					<MyMazes unlocked={canCreateMaze(clearedCount)} />
				</Stack>
			</Stack>
		</Container>
	);
}
