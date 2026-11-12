/*
 * じぶんのめいろのプレイ（仕様書README.mdの「プレイ」の/mazes/$mazeId/play）
 * 見出しはしょうさい画面と同じ迷路の名前。左の「もどる」の矢印で、しょうさいへ戻る
 * 自分の迷路には枚数の上限がない（domain.mdの「プログラムの正しさ」）
 */
import { ActionIcon, Group, Title } from "@mantine/core";
import { Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { PlayScreen } from "../../../widgets/play-screen";
import { useMyMaze } from "../model/use-my-maze";
import { Offline } from "./MazeDetailPage";

type Props = {
	// URLの$mazeIdの値
	mazeId: string;
};

export function MazePlayPage({ mazeId }: Props) {
	const access = useMyMaze(mazeId);

	if (access.kind === "home") return <Navigate to="/" replace />;
	if (access.kind === "hidden") return null;
	if (access.kind === "offline") return <Offline onRetry={access.retry} />;

	const { maze } = access;
	return (
		<PlayScreen
			target={{ kind: "maze", mazeId: maze.mazeId }}
			maze={maze.data}
			maxCards={null}
			header={
				<Group gap="sm" wrap="nowrap">
					<ActionIcon
						renderRoot={(props) => (
							<Link to="/mazes/$mazeId" params={{ mazeId: maze.mazeId }} {...props} />
						)}
						variant="subtle"
						aria-label="迷路のしょうさいにもどる"
					>
						<ChevronLeft aria-hidden size={40} />
					</ActionIcon>
					{/* 児童が入れた名前は、テキストとして描く */}
					<Title order={1}>{maze.name}</Title>
				</Group>
			}
		/>
	);
}
