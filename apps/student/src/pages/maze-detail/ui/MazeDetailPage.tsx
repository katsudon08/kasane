/*
 * じぶんのめいろのしょうさい（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * 見出しは迷路の名前、左に「もどる」の矢印（ホームへ）。画面の大部分に迷路の3D
 * 迷路はGET /me/mazesのキャッシュからmazeIdで探す（キャッシュがなければ一覧を取ってから探し、見つからなければホームへ移る）
 * 一覧はチュートリアルを全部クリアするまで取りに行かないので、それまではホームへ移る
 * 「この迷路で遊ぶ」はタスク12、「この迷路を変える」「この迷路を消す」はタスク13で足す
 */
import { canCreateMaze } from "@kasane/core";
import { ActionIcon, Container, Group, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { MazeScene, mazeQueries } from "../../../entities/maze";
import { meQueries } from "../../../entities/student";
import { StudentAccessLost } from "../../../shared/api";
import { OfflineNotice } from "../../../shared/ui/failure-message";

type Props = {
	// URLの$mazeIdの値
	mazeId: string;
};

export function MazeDetailPage({ mazeId }: Props) {
	const me = useQuery(meQueries.me());
	const unlocked = me.data !== undefined && canCreateMaze(me.data.clearedCount);
	const mazes = useQuery({ ...mazeQueries.list(), enabled: unlocked });

	// 授業を続けられないとき（401・410）は、/joinか/endedへ移るので何も出さない
	if (me.isPending || me.error instanceof StudentAccessLost) return null;
	if (me.isError) return <Offline onRetry={() => void me.refetch()} />;
	if (!unlocked) return <Navigate to="/" replace />;
	if (mazes.isPending || mazes.error instanceof StudentAccessLost) return null;
	if (mazes.isError) return <Offline onRetry={() => void mazes.refetch()} />;

	const maze = mazes.data.find((candidate) => candidate.mazeId === mazeId);
	if (maze === undefined) return <Navigate to="/" replace />;

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
					{/* 児童が入れた名前は、テキストとして描く */}
					<Title order={1}>{maze.name}</Title>
				</Group>
				<MazeScene maze={maze.data} />
			</Stack>
		</Container>
	);
}

function Offline({ onRetry }: { onRetry: () => void }) {
	return (
		<Container size="lg" py="xl">
			<OfflineNotice onRetry={onRetry} />
		</Container>
	);
}
