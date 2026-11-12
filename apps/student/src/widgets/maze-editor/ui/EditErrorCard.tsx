/*
 * 置けない・減らせないときの理由（仕様書README.mdの「めいろをつくる / 変える」）
 * マス目の下に、アイコン付きのカードで3秒ほど出す。モーダルにはしない（編集中に何度も起きるので、そのたびに閉じさせない）
 */
import { CircleAlert } from "lucide-react";

import { EditErrorText } from "../../../features/edit-maze";
import type { EditError } from "../../../features/edit-maze";

import classes from "./MazeEditor.module.css";

export function EditErrorCard({ reason }: { reason: EditError }) {
	return (
		<div className={classes.errorCard} role="alert">
			<CircleAlert aria-hidden size={32} className={classes.errorIcon} />
			<p className={classes.errorText}>
				<EditErrorText reason={reason} />
			</p>
		</div>
	);
}
