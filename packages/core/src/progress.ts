/*
 * 進み具合のルール（仕様書domain.mdの「進み具合のルール」）
 * クリア数（clearedCount）は保存せず、送った記録から数える
 */

import { TUTORIALS } from "./tutorials";

// チュートリアルnoが解けるか。順番に解く前提で、クリア数の次の問題まで解ける
export function isTutorialUnlocked(no: number, clearedCount: number): boolean {
	return no <= clearedCount + 1;
}

// 自分の迷路を作れるか。チュートリアルを全部クリアしてから
export function canCreateMaze(clearedCount: number): boolean {
	return clearedCount >= TUTORIALS.length;
}
