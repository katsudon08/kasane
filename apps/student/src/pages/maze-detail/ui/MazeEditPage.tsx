/*
 * めいろを変える（仕様書README.mdの「めいろをつくる / 変える」の/mazes/$mazeId/edit）
 * 迷路はGET /me/mazesのキャッシュからmazeIdで探す（use-my-maze）。大きさは変えない
 */
import { Navigate } from "@tanstack/react-router";

import { MazeEditor } from "../../../widgets/maze-editor";
import { useMyMaze } from "../model/use-my-maze";
import { Offline } from "./MazeDetailPage";

type Props = {
	// URLの$mazeIdの値
	mazeId: string;
};

export function MazeEditPage({ mazeId }: Props) {
	const access = useMyMaze(mazeId);

	if (access.kind === "home") return <Navigate to="/" replace />;
	if (access.kind === "hidden") return null;
	if (access.kind === "offline") return <Offline onRetry={access.retry} />;

	const { maze } = access;
	return (
		<MazeEditor
			target={{ kind: "edit", mazeId: maze.mazeId }}
			initialName={maze.name}
			initialMaze={maze.data}
		/>
	);
}
