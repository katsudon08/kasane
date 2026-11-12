// 迷路の2Dのスタートの矢印（仕様書README.mdの「迷路の2D」）
import type { Direction } from "@kasane/core";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const START_CHEVRONS: Readonly<Record<Direction, LucideIcon>> = {
	north: ChevronUp,
	east: ChevronRight,
	south: ChevronDown,
	west: ChevronLeft,
};
