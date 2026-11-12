/*
 * 今見ている階のマス目（仕様書README.mdの「めいろをつくる / 変える」）
 * タップで正確に塗れるよう3Dにせず、迷路の2D（MazeMap）の上に、マスと同じ大きさの透明なボタンを重ねる
 */
import type { Maze } from "@kasane/core";
import { memo } from "react";
import type { CSSProperties } from "react";

import { MazeMap } from "../../../entities/maze";

import classes from "./MazeEditor.module.css";

type Props = {
	maze: Maze;
	layer: number;
	onTap: (y: number, x: number) => void;
};

export const EditableGrid = memo(function EditableGrid({ maze, layer, onTap }: Props) {
	const rows = maze.layers[layer] ?? [];
	const size = rows.length;

	return (
		<div className={classes.grid} style={{ "--cells": size } as CSSProperties}>
			<MazeMap maze={maze} layer={layer} className={classes.gridMap} />
			<div
				className={classes.gridCells}
				style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
			>
				{rows.map((cells, y) =>
					cells.map((_, x) => (
						<button
							// マスは並びが変わらないので、位置をkeyにする
							key={`${y}-${x}`}
							type="button"
							className={classes.gridCell}
							aria-label={`${y + 1}行${x + 1}列`}
							onClick={() => onTap(y, x)}
						/>
					)),
				)}
			</div>
		</div>
	);
});
