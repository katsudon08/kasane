/*
 * プレイ画面の迷路の3Dを、描くときに初めて読み込む（three.jsとdreiは大きいため。LazyMazeSceneと同じ）
 * 読み込む間は何も描かない（後ろのカメラ映像が見えている）
 */
import { Suspense, lazy, memo } from "react";

import type { PlaySceneProps } from "./PlayScene";

const PlayScene = lazy(async () => {
	const module = await import("./PlayScene");
	return { default: module.PlayScene };
});

// カードを読み取るたびに画面は描き直されるが、迷路と動きが変わらなければ3Dの部品をたどらない
export const LazyPlayScene = memo(function LazyPlayScene(props: PlaySceneProps) {
	return (
		<Suspense fallback={null}>
			<PlayScene {...props} />
		</Suspense>
	);
});
