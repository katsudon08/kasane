/*
 * 問題を飛ばす（仕様書README.mdの「ホーム」「問題を飛ばす」）
 * 1. 「問題を飛ばす」を押すと、モーダルで先生に確認したかを聞く（「まだ確認していない」は閉じるだけ）
 * 2. 「先生に確認した」を押すと、同じモーダルの中で、どの問題から始めるかを選ぶ
 * 3. 選んで「問題を飛ばす」を押すと、選んだ問題の一つ前までをクリアしたことにする
 * 先生の画面には操作を足さない（先生は口頭で許可するだけ）
 */
import { TUTORIALS } from "@kasane/core";
import { Button, Group, Modal, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SkipForward } from "lucide-react";
import { useState } from "react";

import { meQueries } from "../../../entities/student";
import { StudentAccessLost } from "../../../shared/api";
import { ConfirmContent } from "../../../shared/ui/confirm-dialog";
import { FailureMessage } from "../../../shared/ui/failure-message";
import { RubyText } from "../../../shared/ui/ruby-text";
import { skipTutorials } from "../api/skip-tutorials";
import { ALL_SKIPPED, skipTargets } from "../lib/skip-targets";

import classes from "./HomePage.module.css";

type Props = { clearedCount: number };

type Step = "closed" | "ask" | "choose";

export function SkipTutorials({ clearedCount }: Props) {
	const [step, setStep] = useState<Step>("closed");
	const close = () => setStep("closed");

	return (
		<>
			<Group justify="center">
				<Button
					variant="default"
					leftSection={<SkipForward aria-hidden size={28} />}
					onClick={() => setStep("ask")}
				>
					<SkipLabel />
				</Button>
			</Group>
			{/* 確認から選ぶまでを、一つのモーダルの中で切り替える */}
			<Modal
				opened={step !== "closed"}
				onClose={close}
				centered
				size={640}
				padding="xl"
				radius="lg"
				// 確認の間は、どちらかのボタンで答えてもらう
				withCloseButton={step === "choose"}
				closeOnClickOutside={step === "choose"}
				title={step === "choose" ? <ChooseTitle /> : undefined}
				closeButtonProps={{ "aria-label": "閉じる", size: 64 }}
			>
				{step === "ask" && <AskTeacher onConfirmed={() => setStep("choose")} onCancel={close} />}
				{step === "choose" && <ChooseTarget clearedCount={clearedCount} onDone={close} />}
			</Modal>
		</>
	);
}

type AskTeacherProps = { onConfirmed: () => void; onCancel: () => void };

// 先生に確認したかを聞く。「まだ確認していない」は閉じるだけ
function AskTeacher({ onConfirmed, onCancel }: AskTeacherProps) {
	return (
		<ConfirmContent
			message={
				<>
					<ruby>
						問題<rt>もんだい</rt>
					</ruby>
					を
					<ruby>
						飛<rt>と</rt>
					</ruby>
					ばしてよいか、
					<ruby>
						先生<rt>せんせい</rt>
					</ruby>
					に
					<ruby>
						確認<rt>かくにん</rt>
					</ruby>
					してね
				</>
			}
			actionLabel={
				<>
					<ruby>
						先生<rt>せんせい</rt>
					</ruby>
					に
					<ruby>
						確認<rt>かくにん</rt>
					</ruby>
					した
				</>
			}
			onAction={onConfirmed}
			safeLabel={
				<>
					まだ
					<ruby>
						確認<rt>かくにん</rt>
					</ruby>
					していない
				</>
			}
			onSafe={onCancel}
		/>
	);
}

function ChooseTitle() {
	return (
		<Text fw={700} size="lg">
			どの
			<ruby>
				問題<rt>もんだい</rt>
			</ruby>
			から
			<ruby>
				始<rt>はじ</rt>
			</ruby>
			める？
		</Text>
	);
}

function SkipLabel() {
	return (
		<>
			<ruby>
				問題<rt>もんだい</rt>
			</ruby>
			を
			<ruby>
				飛<rt>と</rt>
			</ruby>
			ばす
		</>
	);
}

type ChooseTargetProps = { clearedCount: number; onDone: () => void };

// どの問題から始めるかを選び、飛ばす
function ChooseTarget({ clearedCount, onDone }: ChooseTargetProps) {
	const [to, setTo] = useState<number | null>(null);
	const queryClient = useQueryClient();
	const skip = useMutation({
		mutationFn: skipTutorials,
		onSuccess: async (result) => {
			if (!result.ok) return;
			// クリア数が変わったので取り直してから閉じる（問題の並びと自分の迷路が描き直される）
			await queryClient.invalidateQueries({ queryKey: meQueries.me().queryKey });
			onDone();
		},
		// 授業を続けられないとき（401・410）は/joinか/endedへ移る。それ以外の想定外はエラーバウンダリーで受け止める
		throwOnError: (error) => !(error instanceof StudentAccessLost),
	});

	return (
		<Stack gap="lg">
			<div className={classes.skipTargets} role="group" aria-label="始める問題">
				{skipTargets(clearedCount).map((target) => (
					<UnstyledButton
						key={target}
						className={classes.skipTarget}
						data-selected={target === to || undefined}
						aria-pressed={target === to}
						onClick={() => {
							setTo(target);
							// 選び直したら、前の失敗の文言は消す
							skip.reset();
						}}
					>
						<TargetLabel to={target} />
					</UnstyledButton>
				))}
			</div>
			{skip.data?.ok === false && (
				<FailureMessage>
					インターネットにつながっていません。もう
					<ruby>
						一度<rt>いちど</rt>
					</ruby>
					おしてね
				</FailureMessage>
			)}
			<Button
				fullWidth
				disabled={to === null}
				loading={skip.isPending}
				onClick={() => {
					if (to !== null) skip.mutate(to);
				}}
			>
				<SkipLabel />
			</Button>
		</Stack>
	);
}

// 問題は番号と名前、全部飛ばすは文言で示す
function TargetLabel({ to }: { to: number }) {
	if (to === ALL_SKIPPED) {
		return (
			<span className={classes.skipTargetAll}>
				<ruby>
					全部<rt>ぜんぶ</rt>
				</ruby>
				の
				<ruby>
					問題<rt>もんだい</rt>
				</ruby>
				を
				<ruby>
					飛<rt>と</rt>
				</ruby>
				ばす
			</span>
		);
	}
	const tutorial = TUTORIALS[to - 1];
	if (tutorial === undefined) throw new Error(`チュートリアル${to}がない`);
	return (
		<>
			<span className={classes.skipTargetNumber}>{tutorial.no}</span>
			<span className={classes.skipTargetName}>
				<RubyText value={tutorial.name} />
			</span>
		</>
	);
}
