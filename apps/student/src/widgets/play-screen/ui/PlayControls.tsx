/*
 * カードの並びの下のボタン3つ（仕様書README.mdの「プログラムをつくる」「ロボットを動かす」）
 * ボタンは同じ場所で役割が変わる
 * - つくる: 「最後のカードを消す」「カードを全部消す」（副）、「ロボットを動かす」（主）
 * - 動かす: 「前にもどる」「次に進む」（副。止まっている間だけ押せる）、「一時停止」⇄「ロボットを動かす」（主）
 */
import { Button, Group, Stack } from "@mantine/core";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import type { Run } from "../model/play-reducer";

type Props = {
	run: Run | null;
	hasCards: boolean;
	onRemoveLast: () => void;
	onClear: () => void;
	onSend: () => void;
	onPause: () => void;
	onResume: () => void;
	onBack: () => void;
	onForward: () => void;
};

export function PlayControls({
	run,
	hasCards,
	onRemoveLast,
	onClear,
	onSend,
	onPause,
	onResume,
	onBack,
	onForward,
}: Props) {
	if (run === null) {
		return (
			<Stack gap="sm">
				<Group grow gap="sm">
					<Button variant="default" onClick={onRemoveLast} disabled={!hasCards}>
						<ruby>
							最後<rt>さいご</rt>
						</ruby>
						のカードを
						<ruby>
							消<rt>け</rt>
						</ruby>
						す
					</Button>
					<Button variant="default" onClick={onClear} disabled={!hasCards}>
						カードを
						<ruby>
							全部<rt>ぜんぶ</rt>
						</ruby>
						<ruby>
							消<rt>け</rt>
						</ruby>
						す
					</Button>
				</Group>
				<RunButton onClick={onSend} disabled={!hasCards} />
			</Stack>
		);
	}

	// 結果を待つ間・動いている間は、前後に動かせない（灰色）
	const running = run.phase === "running" ? run : null;
	const paused = running?.playback === "paused";
	const stopping = running?.playback === "pausing" || paused;

	return (
		<Stack gap="sm">
			<Group grow gap="sm">
				<Button
					variant="default"
					onClick={onBack}
					disabled={!paused || running?.turn === 0}
					leftSection={<ChevronLeft aria-hidden size={28} />}
				>
					<ruby>
						前<rt>まえ</rt>
					</ruby>
					にもどる
				</Button>
				<Button
					variant="default"
					onClick={onForward}
					disabled={!paused}
					rightSection={<ChevronRight aria-hidden size={28} />}
				>
					<ruby>
						次<rt>つぎ</rt>
					</ruby>
					に
					<ruby>
						進<rt>すす</rt>
					</ruby>
					む
				</Button>
			</Group>
			{stopping ? (
				<RunButton onClick={onResume} disabled={false} />
			) : (
				<Button
					onClick={onPause}
					disabled={running?.playback !== "playing"}
					leftSection={<Pause aria-hidden size={28} />}
				>
					<ruby>
						一時<rt>いちじ</rt>
					</ruby>
					<ruby>
						停止<rt>ていし</rt>
					</ruby>
				</Button>
			)}
		</Stack>
	);
}

function RunButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
	return (
		<Button onClick={onClick} disabled={disabled} leftSection={<Play aria-hidden size={28} />}>
			ロボットを
			<ruby>
				動<rt>うご</rt>
			</ruby>
			かす
		</Button>
	);
}
