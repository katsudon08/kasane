import { describe, expect, test } from "bun:test";

import { canCreateMaze, isTutorialUnlocked } from "./progress";
import { TUTORIALS } from "./tutorials";

describe("isTutorialUnlocked", () => {
	test.each<[number, number, boolean]>([
		[1, 0, true],
		[2, 0, false],
		[2, 1, true],
		[3, 1, false],
		[7, 5, false],
		[7, 6, true],
		[1, 7, true],
		[7, 7, true],
	])("no=%i, clearedCount=%iなら%p", (no, clearedCount, expected) => {
		expect(isTutorialUnlocked(no, clearedCount)).toBe(expected);
	});
});

describe("canCreateMaze", () => {
	test("チュートリアルは7問", () => {
		expect(TUTORIALS).toHaveLength(7);
	});

	test.each<[number, boolean]>([
		[0, false],
		[6, false],
		[7, true],
		[8, true],
	])("clearedCount=%iなら%p", (clearedCount, expected) => {
		expect(canCreateMaze(clearedCount)).toBe(expected);
	});
});
