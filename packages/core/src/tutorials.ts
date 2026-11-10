/*
 * チュートリアル（仕様書domain.mdの「チュートリアル」）
 * DBには入れず、定数として持つ。迷路はlayersをそのまま配列で書く
 */

import type { Maze } from "./maze";
import { FLOOR, GOAL, HOLE, KEY, START, TELEPORT_UP, WALL } from "./maze";

// 児童画面の文言。漢字にはすべてルビを振るので、ルビの要る部分を分けて持ち、画面が<ruby>要素で組む
export type RubySegment = { text: string; ruby?: string };
export type RubyText = readonly RubySegment[];

export type Tutorial = {
	// 1から始まる番号
	no: number;
	name: RubyText;
	maze: Maze;
	// カードの枚数の上限。上限のない問題はnull
	maxCards: number | null;
};

const W = WALL;
const F = FLOOR;

export const TUTORIALS: readonly Tutorial[] = [
	{
		no: 1,
		name: [
			{ text: "前", ruby: "まえ" },
			{ text: "に" },
			{ text: "進", ruby: "すす" },
			{ text: "もう" },
		],
		maxCards: null,
		maze: {
			startDirection: "east",
			layers: [
				[
					[START, F, F, F, GOAL],
					[W, W, W, W, W],
					[W, W, W, W, W],
					[W, W, W, W, W],
					[W, W, W, W, W],
				],
			],
		},
	},
	{
		no: 2,
		name: [
			{ text: "右", ruby: "みぎ" },
			{ text: "に" },
			{ text: "曲", ruby: "ま" },
			{ text: "がろう" },
		],
		maxCards: null,
		maze: {
			startDirection: "east",
			layers: [
				[
					[START, F, F, W, W],
					[W, W, F, W, W],
					[GOAL, F, F, W, W],
					[W, W, W, W, W],
					[W, W, W, W, W],
				],
			],
		},
	},
	{
		no: 3,
		name: [
			{ text: "左", ruby: "ひだり" },
			{ text: "に" },
			{ text: "曲", ruby: "ま" },
			{ text: "がろう" },
		],
		maxCards: null,
		maze: {
			startDirection: "east",
			layers: [
				[
					[W, W, W, W, W, W],
					[W, W, W, W, W, W],
					[W, W, W, W, W, W],
					[W, W, F, F, F, GOAL],
					[W, W, F, W, W, W],
					[START, F, F, W, W, W],
				],
			],
		},
	},
	{
		no: 4,
		name: [{ text: "穴", ruby: "あな" }, { text: "をうめよう" }],
		maxCards: null,
		maze: {
			startDirection: "east",
			layers: [
				[
					[START, HOLE, F, F, HOLE, W],
					[W, W, W, W, F, W],
					[W, W, W, W, F, W],
					[W, W, W, W, HOLE, W],
					[W, W, W, W, GOAL, W],
					[W, W, W, W, W, W],
				],
			],
		},
	},
	{
		no: 5,
		name: [{ text: "くりかえしを" }, { text: "使", ruby: "つか" }, { text: "おう" }],
		maxCards: 7,
		maze: {
			startDirection: "east",
			layers: [
				[
					[START, F, F, F, W, W, W],
					[W, W, W, F, W, W, W],
					[W, W, W, F, W, W, W],
					[W, W, W, TELEPORT_UP, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
				],
				[
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, F, W, W, W],
					[W, W, W, F, W, W, W],
					[W, W, W, F, W, W, W],
					[W, W, W, GOAL, W, W, W],
				],
			],
		},
	},
	{
		no: 6,
		name: [{ text: "かぎを" }, { text: "取", ruby: "と" }, { text: "ってゴールしよう" }],
		maxCards: 7,
		maze: {
			startDirection: "east",
			layers: [
				[
					[START, F, W, W, W, W, W],
					[W, F, F, W, W, W, W],
					[W, W, TELEPORT_UP, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
				],
				[
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, F, F, W, W, W],
					[W, W, W, F, KEY, W, W],
					[W, W, W, W, F, F, W],
					[W, W, W, W, W, F, GOAL],
					[W, W, W, W, W, W, W],
				],
			],
		},
	},
	{
		no: 7,
		name: [{ text: "くりかえしで" }, { text: "穴", ruby: "あな" }, { text: "をうめよう" }],
		maxCards: 8,
		maze: {
			startDirection: "east",
			layers: [
				[
					[START, HOLE, F, HOLE, F, HOLE, TELEPORT_UP],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
					[W, W, W, W, W, W, W],
				],
				[
					[W, W, W, W, W, W, F],
					[W, W, W, W, W, W, HOLE],
					[W, W, W, W, W, W, F],
					[W, W, W, W, W, W, HOLE],
					[W, W, W, W, W, W, F],
					[W, W, W, W, W, W, HOLE],
					[W, W, W, W, W, W, GOAL],
				],
			],
		},
	},
];
