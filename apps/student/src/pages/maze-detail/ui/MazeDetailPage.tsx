/*
 * じぶんのめいろのしょうさい（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * 見出しは迷路の名前、左に「もどる」の矢印（ホームへ）。画面の大部分に迷路の3D
 * 迷路はGET /me/mazesのキャッシュからmazeIdで探す（use-my-maze）
 * 3Dの下に、主ボタン「この迷路で遊ぶ」、副ボタン「この迷路を変える」「この迷路を消す」を横に並べる
 * 消すは確認を出してからDELETE /me/mazes/:mazeIdを呼び、ホームへ戻る（一覧は無効化して取り直す）
 */
import { ActionIcon, Button, Container, Group, Stack, Title } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { MazeScene, mazeQueries } from "../../../entities/maze";
import { StudentAccessLost } from "../../../shared/api";
import { OfflineNotice } from "../../../shared/ui/failure-message";
import { deleteMaze } from "../api/delete-maze";
import { useMyMaze } from "../model/use-my-maze";
import { DeleteConfirm } from "./DeleteConfirm";

type Props = {
	// URLの$mazeIdの値
	mazeId: string;
};

export function MazeDetailPage({ mazeId }: Props) {
	const access = useMyMaze(mazeId);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const remove = useMutation({
		mutationFn: () => deleteMaze(mazeId),
		onSuccess: async (result) => {
			if (!result.ok) return;
			// 先にホームへ移ってから一覧を取り直す（この画面で、消えた迷路を探しに行かない）
			await navigate({ to: "/", replace: true });
			await queryClient.invalidateQueries({ queryKey: mazeQueries.list().queryKey });
		},
		// 授業を続けられないとき（401・410）は/joinか/endedへ移る。それ以外の想定外はエラーバウンダリーで受け止める
		throwOnError: (error) => !(error instanceof StudentAccessLost),
	});

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
				<Group justify="center" gap="md">
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
					<Button
						variant="default"
						renderRoot={(props) => (
							<Link to="/mazes/$mazeId/edit" params={{ mazeId: maze.mazeId }} {...props} />
						)}
					>
						この
						<ruby>
							迷路<rt>めいろ</rt>
						</ruby>
						を
						<ruby>
							変<rt>か</rt>
						</ruby>
						える
					</Button>
					<Button variant="default" onClick={() => setConfirmingDelete(true)}>
						この
						<ruby>
							迷路<rt>めいろ</rt>
						</ruby>
						を
						<ruby>
							消<rt>け</rt>
						</ruby>
						す
					</Button>
				</Group>
			</Stack>
			{confirmingDelete && (
				<DeleteConfirm
					deleting={remove.isPending}
					offline={remove.data?.ok === false}
					onDelete={() => remove.mutate()}
					onCancel={() => {
						setConfirmingDelete(false);
						remove.reset();
					}}
				/>
			)}
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
