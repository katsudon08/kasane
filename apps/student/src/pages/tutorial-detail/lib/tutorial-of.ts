// URLの番号からチュートリアルを引く（仕様書README.mdの「もんだいのしょうさい」の迷路の読み方）
import { TUTORIALS } from "@kasane/core";
import type { Tutorial } from "@kasane/core";

// 1から始まる番号だけを通す（「01」「1.5」「1e0」のような書き方は通さない）
const NO_PATTERN = /^[1-9][0-9]*$/;

export function tutorialOf(param: string): Tutorial | null {
	if (!NO_PATTERN.test(param)) return null;

	return TUTORIALS[Number(param) - 1] ?? null;
}
