/*
 * ホームの問題のカード（仕様書README.mdの「ホーム」）
 * クリア済みは星＋塗りつぶし、次に解く問題は色つき＋ゆっくり拡大縮小、まだ解けない問題は灰色＋鍵で押せない
 * 状態は色だけでなく、アイコンと動きでも伝える
 */
import type { Tutorial } from "@kasane/core";
import { Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Lock, Star } from "lucide-react";

import { RubyText } from "../../../shared/ui/ruby-text";
import type { TutorialCardState } from "../lib/tutorial-card-state";

import classes from "./HomePage.module.css";

type Props = {
	tutorial: Tutorial;
	state: TutorialCardState;
};

export function TutorialCard({ tutorial, state }: Props) {
	const content = (
		<>
			<span className={classes.icon}>
				{state === "cleared" && <Star aria-hidden size={32} fill="currentColor" />}
				{state === "locked" && <Lock aria-hidden size={32} />}
			</span>
			<span className={classes.number}>{tutorial.no}</span>
			<Text size="xs" inherit className={classes.name}>
				<RubyText value={tutorial.name} />
			</Text>
		</>
	);

	if (state === "locked") {
		return (
			<div className={`${classes.card} ${classes.locked}`} aria-disabled="true">
				{content}
			</div>
		);
	}
	return (
		<Link
			to="/tutorials/$no"
			params={{ no: String(tutorial.no) }}
			className={`${classes.card} ${classes[state]}`}
		>
			{content}
		</Link>
	);
}
