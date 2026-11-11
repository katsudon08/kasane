/*
 * 授業に参加する（仕様書README.mdの「授業に参加する」）
 * ?lesson=がなければ授業QRを読み取り、あればニックネームを入れる
 * 授業のIDが正しくないときは、カメラに戻ってQRコードを写し直してもらう
 */
import { useState } from "react";

import { isLessonId } from "../lib/join-url";
import { LessonScanner } from "./LessonScanner";
import { NicknameForm } from "./NicknameForm";

type Props = {
	// URLの?lesson=の値
	lessonParam: string | undefined;
};

export function JoinPage({ lessonParam }: Props) {
	const lessonId = lessonParam !== undefined && isLessonId(lessonParam) ? lessonParam : null;
	// 授業のIDの形でない値は、APIに送らずに正しくないとする
	const [invalidLesson, setInvalidLesson] = useState(
		lessonParam !== undefined && lessonId === null,
	);

	if (lessonId === null || invalidLesson) {
		return <LessonScanner invalidLesson={invalidLesson} />;
	}
	return <NicknameForm lessonId={lessonId} onInvalidLesson={() => setInvalidLesson(true)} />;
}
