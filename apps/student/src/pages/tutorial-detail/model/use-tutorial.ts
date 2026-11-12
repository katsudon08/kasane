/*
 * URLの番号から、遊んでよいチュートリアルを読む（仕様書README.mdの「もんだいのしょうさい」の迷路の読み方）
 * しょうさいとプレイの両方で使う
 * - 番号が正しくない・まだ解けない問題（isTutorialUnlockedが偽）なら、ホームへ移る
 * - クリア数はホームで読み込んだGET /meのキャッシュから読む。チュートリアルは定数なので通信しない
 */
import { isTutorialUnlocked } from "@kasane/core";
import type { Tutorial } from "@kasane/core";
import { useQuery } from "@tanstack/react-query";

import { meQueries } from "../../../entities/student";
import { StudentAccessLost } from "../../../shared/api";
import { tutorialOf } from "../lib/tutorial-of";

export type TutorialAccess =
	| { kind: "home" }
	// 読み込み中・授業を続けられない（/joinか/endedへ移る）ので何も出さない
	| { kind: "hidden" }
	| { kind: "offline"; retry: () => void }
	| { kind: "ready"; tutorial: Tutorial };

export function useTutorial(noParam: string): TutorialAccess {
	const tutorial = tutorialOf(noParam);
	const me = useQuery(meQueries.me());

	if (tutorial === null) return { kind: "home" };
	if (me.error instanceof StudentAccessLost) return { kind: "hidden" };
	// 取り直し（ゴールの後など）に失敗しても、前に読んだクリア数があればそれで続ける
	if (me.data === undefined) {
		return me.isError ? { kind: "offline", retry: () => void me.refetch() } : { kind: "hidden" };
	}
	if (!isTutorialUnlocked(tutorial.no, me.data.clearedCount)) return { kind: "home" };
	return { kind: "ready", tutorial };
}
