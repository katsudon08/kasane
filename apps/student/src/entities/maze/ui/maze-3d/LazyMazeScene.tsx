/*
 * 迷路の3Dを、描くときに初めて読み込む
 * three.jsとdreiは大きい（約1MB）ので、ミニマップだけを使うホームでは読み込まない
 * 読み込む間は、3Dを描く場所だけを先に出して、画面がずれないようにする
 */
import type { Maze } from "@kasane/core";
import { Suspense, lazy, memo } from "react";

import classes from "./MazeScene.module.css";

const MazeScene = lazy(async () => {
	const module = await import("./MazeScene");
	return { default: module.MazeScene };
});

type Props = { maze: Maze };

// ページが描き直されても、迷路が変わらなければ3Dの部品をたどらない
export const LazyMazeScene = memo(function LazyMazeScene({ maze }: Props) {
	return (
		<Suspense fallback={<div className={classes.stage} />}>
			<MazeScene maze={maze} />
		</Suspense>
	);
});
