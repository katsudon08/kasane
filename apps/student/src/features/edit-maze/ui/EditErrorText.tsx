/*
 * 置けない・減らせないときの文言（仕様書README.mdの「めいろをつくる / 変える」のEditErrorごとの文言）
 * 漢字は小学6年生までのもの、ルビは<ruby>で組む。「壁」「床」は小学校で習わないのでひらがな
 */
import type { EditError } from "../lib/maze-edit";

export function EditErrorText({ reason }: { reason: EditError }) {
	switch (reason) {
		case "startCannotBeOverwritten":
			return (
				<>
					スタートはここにあるよ。
					<ruby>
						動<rt>うご</rt>
					</ruby>
					かすときは、スタートの
					<ruby>
						道具<rt>どうぐ</rt>
					</ruby>
					で
					<ruby>
						別<rt>べつ</rt>
					</ruby>
					のマスをタップしてね
				</>
			);
		case "goalCannotBeOverwritten":
			return (
				<>
					ゴールはここにあるよ。
					<ruby>
						動<rt>うご</rt>
					</ruby>
					かすときは、ゴールの
					<ruby>
						道具<rt>どうぐ</rt>
					</ruby>
					で
					<ruby>
						別<rt>べつ</rt>
					</ruby>
					のマスをタップしてね
				</>
			);
		case "noLayerAbove":
			return (
				<>
					ここは
					<ruby>
						一番上<rt>いちばんうえ</rt>
					</ruby>
					の
					<ruby>
						階<rt>かい</rt>
					</ruby>
					だから、
					<ruby>
						上<rt>うえ</rt>
					</ruby>
					へのテレポートは
					<ruby>
						置<rt>お</rt>
					</ruby>
					けないよ。
					<ruby>
						階<rt>かい</rt>
					</ruby>
					を
					<ruby>
						足<rt>た</rt>
					</ruby>
					してから
					<ruby>
						置<rt>お</rt>
					</ruby>
					いてね
				</>
			);
		case "noLayerBelow":
			return (
				<>
					ここは1
					<ruby>
						階<rt>かい</rt>
					</ruby>
					だから、
					<ruby>
						下<rt>した</rt>
					</ruby>
					へのテレポートは
					<ruby>
						置<rt>お</rt>
					</ruby>
					けないよ
				</>
			);
		case "teleportTargetBlocked":
			return (
				<>
					テレポートの
					<ruby>
						先<rt>さき</rt>
					</ruby>
					がかべか
					<ruby>
						穴<rt>あな</rt>
					</ruby>
					かテレポートになっているよ。
					<ruby>
						先<rt>さき</rt>
					</ruby>
					のマスをゆかにしてから
					<ruby>
						置<rt>お</rt>
					</ruby>
					いてね
				</>
			);
		case "isTeleportTarget":
			return (
				<>
					このマスはテレポートの
					<ruby>
						行<rt>い</rt>
					</ruby>
					き
					<ruby>
						先<rt>さき</rt>
					</ruby>
					だよ。ここにはかべ・
					<ruby>
						穴<rt>あな</rt>
					</ruby>
					・テレポートを
					<ruby>
						置<rt>お</rt>
					</ruby>
					けないよ
				</>
			);
		case "maxLayers":
			return (
				<>
					<ruby>
						階<rt>かい</rt>
					</ruby>
					は3
					<ruby>
						階<rt>かい</rt>
					</ruby>
					までだよ
				</>
			);
		case "minLayers":
			return (
				<>
					1
					<ruby>
						階<rt>かい</rt>
					</ruby>
					は
					<ruby>
						減<rt>へ</rt>
					</ruby>
					らせないよ
				</>
			);
		case "layerHasStartOrGoal":
			return (
				<>
					この
					<ruby>
						階<rt>かい</rt>
					</ruby>
					にはスタートかゴールがあるから
					<ruby>
						減<rt>へ</rt>
					</ruby>
					らせないよ。
					<ruby>
						先<rt>さき</rt>
					</ruby>
					に
					<ruby>
						別<rt>べつ</rt>
					</ruby>
					の
					<ruby>
						階<rt>かい</rt>
					</ruby>
					へ
					<ruby>
						動<rt>うご</rt>
					</ruby>
					かしてね
				</>
			);
		case "layerIsTeleportTarget":
			return (
				<>
					<ruby>
						下<rt>した</rt>
					</ruby>
					の
					<ruby>
						階<rt>かい</rt>
					</ruby>
					からこの
					<ruby>
						階<rt>かい</rt>
					</ruby>
					へのテレポートがあるから
					<ruby>
						減<rt>へ</rt>
					</ruby>
					らせないよ。
					<ruby>
						先<rt>さき</rt>
					</ruby>
					にそのテレポートをゆかにしてね
				</>
			);
	}
}
