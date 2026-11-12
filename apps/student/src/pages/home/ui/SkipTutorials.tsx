/*
 * 問題を飛ばす（仕様書README.mdの「ホーム」「問題を飛ばす」）
 * 1. 「問題を飛ばす」を押すと、先生に確認したかを聞く（「まだ確認していない」は閉じるだけ）
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
import { ConfirmDialog } from "../../../shared/ui/confirm-dialog";
import { FailureMessage } from "../../../shared/ui/failure-message";
import { RubyText } from "../../../shared/ui/ruby-text";
import { skipTutorials } from "../api/skip-tutorials";
import { ALL_SKIPPED, skipTargets } from "../lib/skip-targets";

import classes from "./HomePage.module.css";

type Props = { clearedCount: number };

type Step = "closed" | "ask" | "choose";

export function SkipTutorials({ clearedCount }: Props) {
	const [step, setStep] = useState<Step>("closed");

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
			{step === "ask" && (
				<ConfirmDialog
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
					onAction={() => setStep("choose")}
					safeLabel={
						<>
							まだ
							<ruby>
								確認<rt>かくにん</rt>
							</ruby>
							していない
						</>
					}
					onSafe={() => setStep("closed")}
				/>
			)}
			{step === "choose" && (
				<ChooseTarget clearedCount={clearedCount} onClose={() => setStep("closed")} />
			)}
		</>
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

type ChooseTargetProps = { clearedCount: number; onClose: () => void };

// どの問題から始めるかを選び、飛ばす。開いている間だけ描く
function ChooseTarget({ clearedCount, onClose }: ChooseTargetProps) {
	const [to, setTo] = useState<number | null>(null);
	const queryClient = useQueryClient();
	const skip = useMutation({
		mutationFn: skipTutorials,
		onSuccess: async (result) => {
			if (!result.ok) return;
			// クリア数が変わったので取り直してから閉じる（問題の並びと自分の迷路が描き直される）
			await queryClient.invalidateQueries({ queryKey: meQueries.me().queryKey });
			onClose();
		},
		// 授業を続けられないとき（401・410）は/joinか/endedへ移る。それ以外の想定外はエラーバウンダリーで受け止める
		throwOnError: (error) => !(error instanceof StudentAccessLost),
	});

	return (
		<Modal
			opened
			onClose={onClose}
			centered
			size={640}
			padding="xl"
			radius="lg"
			title={
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
			}
			closeButtonProps={{ "aria-label": "閉じる", size: 64 }}
		>
			<Stack gap="lg">
				<div className={classes.skipTargets} role="group" aria-label="始める問題">
					{skipTargets(clearedCount).map((target) => (
						<UnstyledButton
							key={target}
							className={classes.skipTarget}
							data-selected={target === to || undefined}
							aria-pressed={target === to}
							onClick={() => setTo(target)}
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
		</Modal>
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
