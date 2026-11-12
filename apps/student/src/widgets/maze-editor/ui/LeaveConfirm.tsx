/*
 * 作っている途中で画面を離れようとしたときの確認（仕様書README.mdの「めいろをつくる / 変える」）
 * 左に「作るのをやめる」（枠だけ）、右に「作り続ける」（青の塗りつぶし）
 */
import { ConfirmDialog } from "../../../shared/ui/confirm-dialog";

type Props = {
	onLeave: () => void;
	onStay: () => void;
};

// 開いている間だけ描く
export function LeaveConfirm({ onLeave, onStay }: Props) {
	return (
		<ConfirmDialog
			message={
				<>
					まだ
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					ができあがっていないよ。やめると、
					<ruby>
						今<rt>いま</rt>
					</ruby>
					の
					<ruby>
						形<rt>かたち</rt>
					</ruby>
					は
					<ruby>
						消<rt>き</rt>
					</ruby>
					えるよ
				</>
			}
			actionLabel={
				<>
					<ruby>
						作<rt>つく</rt>
					</ruby>
					るのをやめる
				</>
			}
			onAction={onLeave}
			safeLabel={
				<>
					<ruby>
						作<rt>つく</rt>
					</ruby>
					り
					<ruby>
						続<rt>つづ</rt>
					</ruby>
					ける
				</>
			}
			onSafe={onStay}
		/>
	);
}
