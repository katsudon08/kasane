/*
 * 迷路の2Dのスタートの矢印（仕様書README.mdの「迷路の2D」）
 * スタートの向きは、northがChevronUp、eastがChevronRight、southがChevronDown、westがChevronLeft
 */
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { describe, expect, it } from "vitest";

import { START_CHEVRONS } from "./start-chevrons";

describe("START_CHEVRONS", () => {
	it.each([
		{ direction: "north", icon: ChevronUp },
		{ direction: "east", icon: ChevronRight },
		{ direction: "south", icon: ChevronDown },
		{ direction: "west", icon: ChevronLeft },
	] as const)("$directionのスタートは、仕様書の表のアイコン", ({ direction, icon }) => {
		expect(START_CHEVRONS[direction]).toBe(icon);
	});
});
