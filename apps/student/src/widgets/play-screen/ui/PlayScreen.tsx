/*
 * プレイ（仕様書README.mdの「プレイ」「プログラムをつくる」「ロボットを動かす」）
 * 一つの画面の中で「プログラムをつくる」と「ロボットを動かす」が切り替わる
 * - 左半分: カメラ映像を背景に、迷路の3Dを重ねる。右上に、ロボットが今いる階の2Dのミニマップとロボットの位置と向き
 * - 右半分: カードの並びと、下にボタン3つ（結果が出たら、結果の文言と主ボタン）
 * カードの並びはこの画面のuseReducerで持ち、カメラは並びの変化で描き直さない
 */
import type { Card, Maze, Program } from "@kasane/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { MazeMap, PlayScene, boardAt, robotAt } from "../../../entities/maze";
import type { MapRobot, PlayAnimation } from "../../../entities/maze";
import { meQueries } from "../../../entities/student";
import { CardList, RepeatTimesModal, commandAt } from "../../../features/edit-program";
import type { Cursor } from "../../../features/edit-program";
import { StudentAccessLost } from "../../../shared/api";
import { FailureMessage } from "../../../shared/ui/failure-message";
import { sendProgram } from "../api/send-program";
import { afterGoal, failedCardNumber } from "../lib/outcome";
import type { PlayTarget } from "../lib/outcome";
import { playScanSound } from "../lib/scan-sound";
import { currentCard, initialPlayState, isAnimating, playReducer } from "../model/play-reducer";
import type { Run } from "../model/play-reducer";
import { CardCamera } from "./CardCamera";
import { ClearConfirm } from "./ClearConfirm";
import { NoticeText } from "./Messages";
import { PlayControls } from "./PlayControls";
import { ResultPanel } from "./ResultPanel";

import classes from "./PlayScreen.module.css";

type Props = {
	target: PlayTarget;
	maze: Maze;
	// 問題の上限枚数。上限のない問題と自分の迷路はnull
	maxCards: number | null;
	// 見出し（「もどる」の矢印と、問題の番号と名前・迷路の名前）
	header: ReactNode;
};

// 3Dに渡す、今どのターンをどう動かしているか
function animationOf(run: Run | null): PlayAnimation | null {
	if (run === null || run.phase === "sending") return null;
	const { steps, outcome } = run.result;
	if (run.phase === "done") return { steps, outcome, turn: steps.length, animating: false };
	return { steps, outcome, turn: run.turn, animating: isAnimating(run) };
}

export function PlayScreen({ target, maze, maxCards, header }: Props) {
	const [state, dispatch] = useReducer(playReducer, maxCards, initialPlayState);
	const { program, cursor, collapsed, arrived, scans, notice, run } = state;
	// 回数を変えているくりかえし（モーダルを開いている間だけ）
	const [timesPath, setTimesPath] = useState<number[] | null>(null);
	const [confirmingClear, setConfirmingClear] = useState(false);
	/*
	 * モーダルを開いている間は、読み取ったカードを入れない
	 * 回数を変えているくりかえしは位置で覚えているので、前にカードが入ると別のくりかえしを指してしまう
	 */
	const modalOpen = useRef(false);
	useEffect(() => {
		modalOpen.current = timesPath !== null || confirmingClear;
	}, [timesPath, confirmingClear]);

	// カードを読み取れたら、短い効果音
	useEffect(() => {
		if (scans > 0) playScanSound();
	}, [scans]);

	const queryClient = useQueryClient();
	const send = useMutation({
		mutationFn: async (sentProgram: Program) => {
			const sent = await sendProgram(target, sentProgram);
			// クリア数が変わるのはチュートリアルに挑戦したときだけ。次の問題が解放されてから結果を出す
			if (sent.ok && target.kind === "tutorial") {
				await queryClient.invalidateQueries({ queryKey: meQueries.me().queryKey });
			}
			return sent;
		},
		onSuccess: (sent) => {
			dispatch(sent.ok ? { type: "received", result: sent.result } : { type: "sendFailed" });
		},
		// 授業を続けられないとき（401・410）は/joinか/endedへ移る。それ以外の想定外はエラーバウンダリーで受け止める
		throwOnError: (error) => !(error instanceof StudentAccessLost),
	});

	// 並びの変化で描き直さない部品に渡すので、関数を作り直さない
	const onCards = useCallback((cards: Card[]) => {
		if (!modalOpen.current) dispatch({ type: "scanned", cards });
	}, []);
	const onCursor = useCallback(
		(next: Cursor) => dispatch({ type: "cursorMoved", cursor: next }),
		[],
	);
	const onRemove = useCallback((path: number[]) => dispatch({ type: "removed", path }), []);
	const onToggle = useCallback((path: number[]) => dispatch({ type: "toggled", path }), []);
	const onTimes = useCallback((path: number[]) => setTimesPath(path), []);
	const onTurnEnd = useCallback((turn: number) => dispatch({ type: "turnEnded", turn }), []);

	const handleSend = () => {
		dispatch({ type: "sent" });
		// 持っている木構造をそのまま送る
		send.mutate(program);
	};

	const animation = useMemo(() => animationOf(run), [run]);
	/*
	 * 結果を出している間は、止まったカード（bumpとfall）だけを赤で示す
	 * tooLongなどは最後に動かしたカードが原因ではないので、原因に見えないように示さない（README.mdの「結果」）
	 */
	const current = useMemo(() => {
		const card = currentCard(run);
		return run?.phase === "done" && card?.failed !== true ? null : card;
	}, [run]);
	const steps = animation?.steps;
	const turn = animation?.turn ?? 0;

	// ミニマップは、ロボットが今いる階を、ターンごとに描き直す
	const robot = useMemo(() => robotAt(maze, steps ?? [], turn), [maze, steps, turn]);
	const board = useMemo(() => boardAt(maze, steps ?? [], turn), [maze, steps, turn]);
	const mapRobot = useMemo<MapRobot | undefined>(
		() => (robot.visible ? { x: robot.x, y: robot.y, direction: robot.direction } : undefined),
		[robot],
	);

	const repeat = timesPath === null ? null : commandAt(program, timesPath);

	return (
		<div className={classes.screen}>
			{header}
			<div className={classes.main}>
				<section className={classes.stage} aria-label="カメラと迷路">
					<CardCamera onCards={onCards} />
					<PlayScene
						maze={maze}
						animation={animation}
						preparing={run?.phase === "sending"}
						onTurnEnd={onTurnEnd}
					/>
					<MazeMap maze={board} layer={robot.layer} robot={mapRobot} className={classes.minimap} />
				</section>

				<section className={classes.side} aria-label="カードの並び">
					<div className={classes.cards}>
						<CardList
							program={program}
							cursor={cursor}
							collapsed={collapsed}
							current={current}
							arrived={arrived}
							editable={run === null}
							onCursor={onCursor}
							onRemove={onRemove}
							onToggle={onToggle}
							onTimes={onTimes}
						/>
					</div>

					{run === null && notice !== null && (
						<FailureMessage>
							<NoticeText notice={notice} />
						</FailureMessage>
					)}

					{run?.phase === "done" ? (
						<ResultPanel
							result={run.result}
							cardNumber={failedCardNumber(program, run.result)}
							afterGoal={afterGoal(target)}
							onFix={() => dispatch({ type: "fixing" })}
						/>
					) : (
						<PlayControls
							run={run}
							hasCards={program.length > 0}
							onRemoveLast={() => dispatch({ type: "lastRemoved" })}
							onClear={() => setConfirmingClear(true)}
							onSend={handleSend}
							onPause={() => dispatch({ type: "paused" })}
							onResume={() => dispatch({ type: "resumed" })}
							onBack={() => dispatch({ type: "steppedBack" })}
							onForward={() => dispatch({ type: "steppedForward" })}
						/>
					)}
				</section>
			</div>

			{timesPath !== null && repeat?.type === "repeat" && (
				<RepeatTimesModal
					times={repeat.times}
					onClose={(times) => {
						dispatch({ type: "timesChanged", path: timesPath, times });
						setTimesPath(null);
					}}
				/>
			)}
			{confirmingClear && (
				<ClearConfirm
					onClear={() => {
						dispatch({ type: "cleared" });
						setConfirmingClear(false);
					}}
					onCancel={() => setConfirmingClear(false)}
				/>
			)}
		</div>
	);
}
