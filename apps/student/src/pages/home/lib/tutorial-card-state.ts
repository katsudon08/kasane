// ホームの問題のカードの状態（仕様書README.mdの「ホーム」、domain.mdの「進み具合のルール」）
import { isTutorialUnlocked } from "@kasane/core";

// クリア済み・次に解く問題・まだ解けない問題
export type TutorialCardState = "cleared" | "next" | "locked";

export function tutorialCardState(no: number, clearedCount: number): TutorialCardState {
	if (no <= clearedCount) return "cleared";
	return isTutorialUnlocked(no, clearedCount) ? "next" : "locked";
}
