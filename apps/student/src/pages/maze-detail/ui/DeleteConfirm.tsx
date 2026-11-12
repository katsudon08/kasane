/*
 * 「この迷路を消す」の確認（仕様書README.mdの「もんだいのしょうさい / じぶんのめいろのしょうさい」）
 * 通信できなかったときは、モーダルを開いたまま文言を出し、もう一度押してもらう
 */
import { ConfirmDialog } from "../../../shared/ui/confirm-dialog";
import { FailureMessage } from "../../../shared/ui/failure-message";

type Props = {
	deleting: boolean;
	offline: boolean;
	onDelete: () => void;
	onCancel: () => void;
};

// 開いている間だけ描く
export function DeleteConfirm({ deleting, offline, onDelete, onCancel }: Props) {
	return (
		<ConfirmDialog
			message={
				<>
					この
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					を
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
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					を
					<ruby>
						消<rt>け</rt>
					</ruby>
					す
				</>
			}
			onAction={onDelete}
			acting={deleting}
			safeLabel={
				<>
					<ruby>
						迷路<rt>めいろ</rt>
					</ruby>
					を
					<ruby>
						残<rt>のこ</rt>
					</ruby>
					す
				</>
			}
			onSafe={onCancel}
		>
			{offline && (
				<FailureMessage>
					インターネットにつながっていません。もう
					<ruby>
						一度<rt>いちど</rt>
					</ruby>
					おしてね
				</FailureMessage>
			)}
		</ConfirmDialog>
	);
}
