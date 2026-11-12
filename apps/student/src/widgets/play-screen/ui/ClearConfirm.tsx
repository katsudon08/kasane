/*
 * 「カードを全部消す」の確認（仕様書README.mdの「プログラムをつくる」）
 * 安全な側（残す）を青の塗りつぶしで強調し、押した結果が分かる言葉にする（README.mdの「めいろをつくる」の確認と同じ形）
 */
import { ConfirmDialog } from "../../../shared/ui/confirm-dialog";

type Props = {
	onClear: () => void;
	onCancel: () => void;
};

// 開いている間だけ描く
export function ClearConfirm({ onClear, onCancel }: Props) {
	return (
		<ConfirmDialog
			message={
				<>
					カードを
					<ruby>
						全部<rt>ぜんぶ</rt>
					</ruby>
					<ruby>
						消<rt>け</rt>
					</ruby>
					すと、
					<ruby>
						元<rt>もと</rt>
					</ruby>
					にもどせないよ
				</>
			}
			actionLabel={
				<>
					カードを
					<ruby>
						全部<rt>ぜんぶ</rt>
					</ruby>
					<ruby>
						消<rt>け</rt>
					</ruby>
					す
				</>
			}
			onAction={onClear}
			safeLabel={
				<>
					カードを
					<ruby>
						残<rt>のこ</rt>
					</ruby>
					す
				</>
			}
			onSafe={onCancel}
		/>
	);
}
