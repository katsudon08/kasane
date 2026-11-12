/*
 * くりかえしの回数のモーダル（仕様書README.mdの「プログラムをつくる」、domain.mdの「カードの並びの編集」）
 * 「＜」「＞」で回数を2〜10に変える（2で「＜」、10で「＞」は押せない）。閉じるとカードに反映する
 */
import { ActionIcon, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { MAX_REPEAT_TIMES, MIN_REPEAT_TIMES } from "../lib/program-edit";

type Props = {
	// 開いたときの回数
	times: number;
	// どう閉じても（ボタン・外側・Esc）、そのときの回数を反映する
	onClose: (times: number) => void;
};

// 開くたびに作り直す（呼ぶ側は、開いている間だけ描く）
export function RepeatTimesModal({ times: initial, onClose }: Props) {
	const [times, setTimes] = useState(initial);
	const close = () => onClose(times);

	return (
		<Modal
			opened
			onClose={close}
			centered
			size="md"
			title={
				<Text fw={700} size="lg">
					<ruby>
						何<rt>なん</rt>
					</ruby>
					<ruby>
						回<rt>かい</rt>
					</ruby>
					くりかえす？
				</Text>
			}
			closeButtonProps={{ "aria-label": "閉じる", size: 64 }}
		>
			<Stack gap="xl" align="center">
				<Group gap="xl" wrap="nowrap">
					<ActionIcon
						variant="light"
						onClick={() => setTimes(times - 1)}
						disabled={times <= MIN_REPEAT_TIMES}
						aria-label="回数を1へらす"
					>
						<ChevronLeft aria-hidden size={40} />
					</ActionIcon>
					<Text fw={700} fz={56} miw={140} ta="center" aria-live="polite">
						{times}
						<ruby>
							回<rt>かい</rt>
						</ruby>
					</Text>
					<ActionIcon
						variant="light"
						onClick={() => setTimes(times + 1)}
						disabled={times >= MAX_REPEAT_TIMES}
						aria-label="回数を1ふやす"
					>
						<ChevronRight aria-hidden size={40} />
					</ActionIcon>
				</Group>
				<Button onClick={close} fullWidth>
					この
					<ruby>
						回数<rt>かいすう</rt>
					</ruby>
					にする
				</Button>
			</Stack>
		</Modal>
	);
}
