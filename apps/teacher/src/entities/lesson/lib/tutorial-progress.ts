export type TutorialProgress =
	| { readonly allCleared: true }
	// labelは「チュートリアル3/7」の形。percentはクリアした問題の割合（0〜100）で、進捗バーに使う
	| { readonly allCleared: false; readonly label: string; readonly percent: number };

/*
 * 進み具合の「進み」の表示（仕様書README.mdの「進み具合」）
 * 何問目は今の問題（クリア数＋1。backend.mdの「教師に見せる状態の求め方」）
 */
export function tutorialProgress(clearedCount: number, tutorialCount: number): TutorialProgress {
	if (clearedCount >= tutorialCount) return { allCleared: true };

	return {
		allCleared: false,
		label: `チュートリアル${clearedCount + 1}/${tutorialCount}`,
		percent: (clearedCount / tutorialCount) * 100,
	};
}
