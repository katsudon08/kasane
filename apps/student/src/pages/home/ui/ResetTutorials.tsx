/*
 * 問題をリセットする（仕様書free-mode.mdの「問題をリセットする」）
 * 自由モードのホームだけに置き、「問題を飛ばす」の右に副のボタンで出す（クリア数が0のときは出さないので、置く側で決める）
 * 押すと確認を出し、「問題をリセットする」でクリア数を0にする。自分の迷路は消さない
 * 元にもどせない操作なので、確認は安全な側（このまま続ける）を右に置いて強調する
 */
import { Button } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { freeRecords } from "../../../entities/free-record";
import { meQueries } from "../../../entities/student";
import { networkModeOf } from "../../../shared/lib/student-mode";
import { ConfirmDialog } from "../../../shared/ui/confirm-dialog";

export function ResetTutorials() {
	const [confirming, setConfirming] = useState(false);
	const queryClient = useQueryClient();
	const reset = useMutation({
		mutationFn: freeRecords.resetTutorials,
		networkMode: networkModeOf("free"),
		onSuccess: async () => {
			// クリア数が変わったので取り直してから閉じる（問題の並びと自分の迷路が描き直される）
			await queryClient.invalidateQueries({ queryKey: meQueries.me("free").queryKey });
			setConfirming(false);
		},
		// 書けないときは、うまく動かなかったときの受け止めに任せる
		throwOnError: true,
	});

	return (
		<>
			<Button
				variant="default"
				leftSection={<RotateCcw aria-hidden size={28} />}
				onClick={() => setConfirming(true)}
			>
				<ResetLabel />
			</Button>
			{confirming && (
				<ConfirmDialog
					message={
						<>
							<ruby>
								問題<rt>もんだい</rt>
							</ruby>
							をリセットすると、1
							<ruby>
								問目<rt>もんめ</rt>
							</ruby>
							からやり
							<ruby>
								直<rt>なお</rt>
							</ruby>
							しになるよ。
							<ruby>
								自分<rt>じぶん</rt>
							</ruby>
							の
							<ruby>
								迷路<rt>めいろ</rt>
							</ruby>
							は
							<ruby>
								消<rt>き</rt>
							</ruby>
							えないよ
						</>
					}
					actionLabel={<ResetLabel />}
					onAction={() => reset.mutate()}
					acting={reset.isPending}
					safeLabel={
						<>
							このまま
							<ruby>
								続<rt>つづ</rt>
							</ruby>
							ける
						</>
					}
					onSafe={() => setConfirming(false)}
				/>
			)}
		</>
	);
}

function ResetLabel() {
	return (
		<>
			<ruby>
				問題<rt>もんだい</rt>
			</ruby>
			をリセットする
		</>
	);
}
