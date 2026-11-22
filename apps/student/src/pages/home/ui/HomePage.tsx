/*
 * ホーム（仕様書README.mdの「ホーム」）
 * 上部に名前、「問題」にチュートリアルのカードと「問題を飛ばす」、「自分の迷路」に自分が作った迷路を出す
 * チュートリアルはpackages/coreの定数なので通信せず、クリア数だけをGET /meから取る
 * 自由モードの違い（仕様書free-mode.mdの「画面ごとの違い」）
 * - クリア数をlocalStorageから読み、名前は出さない
 * - 「問題」の見出しの左に「もどる」（入口へ）、「問題を飛ばす」の右に「問題をリセットする」（クリア数が0のときは出さない）
 * - デスクトップアプリには入口がないので、「もどる」を出さない（free-mode.mdの「デスクトップアプリ」）
 */
import { TUTORIALS, canCreateMaze } from "@kasane/core";
import { ActionIcon, Container, Group, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { meQueries } from "../../../entities/student";
import { StudentAccessLost } from "../../../shared/api";
import { isDesktop } from "../../../shared/lib/desktop";
import { useStudentMode } from "../../../shared/lib/student-mode";
import { OfflineNotice } from "../../../shared/ui/failure-message";
import { tutorialCardState } from "../lib/tutorial-card-state";
import { MyMazes } from "./MyMazes";
import { ResetTutorials } from "./ResetTutorials";
import { SkipTutorials } from "./SkipTutorials";
import { TutorialCard } from "./TutorialCard";

import classes from "./HomePage.module.css";

export function HomePage() {
	const mode = useStudentMode();
	const me = useQuery(meQueries.me(mode));

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
				{/* 児童が入れた名前は、テキストとして描く。自由モードは名前がないので出さない */}
				{name !== null && <Title order={1}>{name}</Title>}

				<Stack gap="sm" component="section">
					{/*
					 * 見出しの行の右端に「問題を飛ばす」を置く。全部クリアしたら出さない
					 * 自由モードでは、その右に「問題をリセットする」を置く。幅が足りない画面では、ボタンの組を次の行へ送る
					 */}
					<Group justify="space-between" gap="sm">
						<Group gap="sm" wrap="nowrap">
							{mode === "free" && !isDesktop() && (
								<ActionIcon
									renderRoot={(props) => <Link to="/start" {...props} />}
									variant="subtle"
									aria-label="最初の画面にもどる"
								>
									<ChevronLeft aria-hidden size={40} />
								</ActionIcon>
							)}
							<Title order={2}>
								<ruby>
									問題<rt>もんだい</rt>
								</ruby>
							</Title>
						</Group>
						<Group gap="sm" wrap="nowrap">
							{clearedCount < TUTORIALS.length && <SkipTutorials clearedCount={clearedCount} />}
							{mode === "free" && clearedCount > 0 && <ResetTutorials />}
						</Group>
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
