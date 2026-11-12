/*
 * じぶんのめいろのしょうさい（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * 見出しは迷路の名前、左に「もどる」の矢印（ホームへ）。画面の大部分に迷路の3D
 * 迷路はGET /me/mazesのキャッシュからmazeIdで探す（use-my-maze）
 * 3Dの下に主ボタン「この迷路で遊ぶ」。「この迷路を変える」「この迷路を消す」はタスク13で足す
 */
import { ActionIcon, Button, Container, Group, Stack, Title } from "@mantine/core";
import { Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { MazeScene } from "../../../entities/maze";
import { OfflineNotice } from "../../../shared/ui/failure-message";
import { useMyMaze } from "../model/use-my-maze";

type Props = {
	// URLの$mazeIdの値
	mazeId: string;
};

export function MazeDetailPage({ mazeId }: Props) {
	const access = useMyMaze(mazeId);

	if (access.kind === "home") return <Navigate to="/" replace />;
	if (access.kind === "hidden") return null;
	if (access.kind === "offline") return <Offline onRetry={access.retry} />;

	const { maze } = access;
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
				<Group>
					<Button
						renderRoot={(props) => (
							<Link to="/mazes/$mazeId/play" params={{ mazeId: maze.mazeId }} {...props} />
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

export function Offline({ onRetry }: { onRetry: () => void }) {
	return (
		<Container size="lg" py="xl">
			<OfflineNotice onRetry={onRetry} />
		</Container>
	);
}
