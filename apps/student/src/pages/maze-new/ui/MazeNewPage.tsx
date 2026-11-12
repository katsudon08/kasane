/*
 * めいろをつくる（仕様書README.mdの「めいろをつくる / 変える」の/mazes/new）
 * チュートリアルを全部クリアするまでは作れないので、ホームへ移る（サーバーも403 mazeLockedで断る）
 * 初期状態は5×5・1階・すべてゆか・左上にスタート（east）・右下にゴール
 * 名前の初期値は、自分の迷路の名前と重ならない「めいろ1」など（一覧を読んでから決める）
 */
import { canCreateMaze } from "@kasane/core";
import { Container } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";

import { mazeQueries } from "../../../entities/maze";
import { meQueries } from "../../../entities/student";
import { createMaze, defaultMazeName } from "../../../features/edit-maze";
import { StudentAccessLost } from "../../../shared/api";
import { OfflineNotice } from "../../../shared/ui/failure-message";
import { MazeEditor } from "../../../widgets/maze-editor";

const INITIAL_SIZE = 5;

export function MazeNewPage() {
	const me = useQuery(meQueries.me());
	const unlocked = me.data !== undefined && canCreateMaze(me.data.clearedCount);
	const mazes = useQuery({ ...mazeQueries.list(), enabled: unlocked });

	// 読み込み中・授業を続けられないとき（/joinか/endedへ移る）は何も出さない
	if (me.error instanceof StudentAccessLost || mazes.error instanceof StudentAccessLost) {
		return null;
	}
	if (me.data === undefined) {
		return me.isError ? <Offline onRetry={() => void me.refetch()} /> : null;
	}
	if (!unlocked) return <Navigate to="/" replace />;
	if (mazes.data === undefined) {
		return mazes.isError ? <Offline onRetry={() => void mazes.refetch()} /> : null;
	}

	return (
		<MazeEditor
			target={{ kind: "new" }}
			initialName={defaultMazeName(mazes.data.map(({ name }) => name))}
			initialMaze={createMaze(INITIAL_SIZE)}
		/>
	);
}

function Offline({ onRetry }: { onRetry: () => void }) {
	return (
		<Container size="lg" py="xl">
			<OfflineNotice onRetry={onRetry} />
		</Container>
	);
}
