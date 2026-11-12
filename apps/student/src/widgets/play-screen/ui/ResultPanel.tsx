/*
 * 結果（仕様書README.mdの「ロボットを動かす」の結果、domain.mdの「児童画面の文言」）
 * - ゴール: 「ゴールに着いた！」、主ボタン「次の問題に進む」（最後の問題と自分の迷路は「ホームにもどる」）
 * - 失敗: 理由と次の行動、主ボタン「プログラムを直す」（カードの並びを残したまま「つくる」へ戻る）
 * 状態は色だけで伝えず、アイコンも添える
 */
import type { CompileResult } from "@kasane/core";
import { Button, Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { CircleAlert, PartyPopper } from "lucide-react";

import type { AfterGoal } from "../lib/outcome";
import { OutcomeText } from "./Messages";

import classes from "./PlayScreen.module.css";

type Props = {
	result: CompileResult;
	cardNumber: number | null;
	afterGoal: AfterGoal;
	onFix: () => void;
};

export function ResultPanel({ result, cardNumber, afterGoal, onFix }: Props) {
	const succeeded = result.outcome === "goal";

	return (
		<Stack gap="md">
			<Group
				role="status"
				gap="sm"
				wrap="nowrap"
				className={succeeded ? classes.goal : classes.failure}
			>
				{succeeded ? (
					<PartyPopper aria-hidden size={40} style={{ flexShrink: 0 }} />
				) : (
					<CircleAlert aria-hidden size={40} style={{ flexShrink: 0 }} />
				)}
				<Text fw={700} size="lg" inherit>
					<OutcomeText outcome={result.outcome} cardNumber={cardNumber} />
				</Text>
			</Group>
			{succeeded ? <GoalButton afterGoal={afterGoal} /> : <FixButton onFix={onFix} />}
		</Stack>
	);
}

function GoalButton({ afterGoal }: { afterGoal: AfterGoal }) {
	if (afterGoal.kind === "home") {
		return (
			<Button renderRoot={(props) => <Link to="/" {...props} />} className={classes.next}>
				ホームにもどる
			</Button>
		);
	}
	return (
		<Button
			renderRoot={(props) => (
				<Link to="/tutorials/$no" params={{ no: String(afterGoal.no) }} {...props} />
			)}
			className={classes.next}
		>
			<ruby>
				次<rt>つぎ</rt>
			</ruby>
			の
			<ruby>
				問題<rt>もんだい</rt>
			</ruby>
			に
			<ruby>
				進<rt>すす</rt>
			</ruby>
			む
		</Button>
	);
}

function FixButton({ onFix }: { onFix: () => void }) {
	return (
		<Button onClick={onFix} className={classes.next}>
			プログラムを
			<ruby>
				直<rt>なお</rt>
			</ruby>
			す
		</Button>
	);
}
