/*
 * 問題のカードの枚数の上限（プレイ画面の見出しの右端）
 * 上限のある問題（チュートリアル5〜7）だけに出す。上限のない問題と自分の迷路では出さない
 * 「枚」は小学校で習わないのでひらがな
 */
import classes from "./PlayScreen.module.css";

export function CardLimit({ limit }: { limit: number }) {
	return (
		<div className={classes.cardLimit}>
			<span className={classes.cardLimitLabel}>カードは</span>
			<span className={classes.cardLimitCount}>{limit}</span>
			<span className={classes.cardLimitLabel}>まいまで</span>
		</div>
	);
}
