// ニックネーム（仕様書README.mdの「授業に参加する」、backend.mdの「入力の上限」の名前）
// 決まりは迷路の名前と同じなので、shared/lib/nameに置く

export {
	NAME_MAX_LENGTH as NICKNAME_MAX_LENGTH,
	nameOf as nicknameOf,
} from "../../../shared/lib/name";
