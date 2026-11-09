import { describe, expect, test } from "bun:test";

import { compile } from "./compile";
import type { Direction } from "./maze";
import { validateMaze } from "./maze";
import type { Command, Program } from "./program";
import { validateProgram } from "./program";
import type { RubyText } from "./tutorials";
import { TUTORIALS } from "./tutorials";

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const left: Command = { type: "left" };
const fill: Command = { type: "fill" };

function repeat(times: number, body: Command[]): Command {
	return { type: "repeat", times, body };
}

function times(count: number, ...commands: Command[]): Command[] {
	return Array.from({ length: count }, () => commands).flat();
}

function tutorial(no: number) {
	const found = TUTORIALS[no - 1];
	if (found === undefined) throw new Error(`チュートリアル${no}がない`);
	return found;
}

describe("TUTORIALS", () => {
	test("7問が番号順に並ぶ", () => {
		expect(TUTORIALS.map((t) => t.no)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	test.each<[number, RubyText]>([
		[
			1,
			[
				{ text: "前", ruby: "まえ" },
				{ text: "に" },
				{ text: "進", ruby: "すす" },
				{ text: "もう" },
			],
		],
		[
			2,
			[
				{ text: "右", ruby: "みぎ" },
				{ text: "に" },
				{ text: "曲", ruby: "ま" },
				{ text: "がろう" },
			],
		],
		[
			3,
			[
				{ text: "左", ruby: "ひだり" },
				{ text: "に" },
				{ text: "曲", ruby: "ま" },
				{ text: "がろう" },
			],
		],
		[4, [{ text: "穴", ruby: "あな" }, { text: "をうめよう" }]],
		[5, [{ text: "くりかえしを" }, { text: "使", ruby: "つか" }, { text: "おう" }]],
		[6, [{ text: "かぎを" }, { text: "取", ruby: "と" }, { text: "ってゴールしよう" }]],
		[7, [{ text: "くりかえしで" }, { text: "穴", ruby: "あな" }, { text: "をうめよう" }]],
	])("%iの名前（漢字にはすべてルビ）", (no, name) => {
		expect(tutorial(no).name).toEqual(name);
	});

	test.each<[number, number, number, Direction, number | null]>([
		[1, 1, 5, "east", null],
		[2, 1, 5, "east", null],
		[3, 1, 6, "east", null],
		[4, 1, 6, "east", null],
		[5, 2, 7, "east", 7],
		[6, 2, 7, "east", 7],
		[7, 2, 7, "east", 8],
	])(
		"%iは%i階、一辺%i、スタートの向き%s、枚数の上限%p",
		(no, layers, size, direction, maxCards) => {
			const { maze } = tutorial(no);
			expect(maze.layers).toHaveLength(layers);
			expect(maze.layers.every((layer) => layer.length === size)).toBe(true);
			expect(maze.layers.every((layer) => layer.every((row) => row.length === size))).toBe(true);
			expect(maze.startDirection).toBe(direction);
			expect(tutorial(no).maxCards).toBe(maxCards);
		},
	);

	test.each([1, 2, 3, 4, 5, 6, 7])("%iの迷路はvalidateMazeを通る", (no) => {
		expect(validateMaze(tutorial(no).maze)).toEqual({ ok: true });
	});

	const solutions: [number, Program][] = [
		[1, times(4, forward)],
		[2, [...times(2, forward), right, ...times(2, forward), right, ...times(2, forward)]],
		[3, [...times(2, forward), left, ...times(2, forward), right, ...times(3, forward)]],
		[
			4,
			[
				fill,
				...times(3, forward),
				fill,
				forward,
				right,
				...times(2, forward),
				fill,
				...times(2, forward),
			],
		],
		[5, [repeat(3, [forward]), right, repeat(6, [forward])]],
		[6, [forward, repeat(5, [right, forward, left, forward])]],
		[7, [repeat(2, [repeat(3, [fill, forward, forward]), right])]],
	];

	test.each(solutions)("%iの解答の例はvalidateProgramを通り、goalになる", (no, program) => {
		expect(validateProgram(program, tutorial(no).maxCards)).toEqual({ ok: true });
		expect(compile(tutorial(no).maze, program).outcome).toBe("goal");
	});

	test("7は2回目の「右」の前にゴールに着き、残りは実行しない", () => {
		const [, program] = solutions[6]!;
		const { steps } = compile(tutorial(7).maze, program);
		// 1周目9ターン＋右1ターン＋2周目9ターン＝19ターンでゴール
		expect(steps).toHaveLength(19);
		expect(steps.at(-1)?.path).toEqual([0, 0, 2]);
	});

	describe("解答の例をくりかえしなしで書くとvalidateProgramで落ちる", () => {
		const flat: [number, number, Program][] = [
			// 5は10枚
			[5, 10, [...times(3, forward), right, ...times(6, forward)]],
			// 6は21枚
			[6, 21, [forward, ...times(5, right, forward, left, forward)]],
			// 7は入れ子にしないと11枚
			[7, 11, [repeat(3, [fill, forward, forward]), right, repeat(3, [fill, forward, forward])]],
		];

		test.each(flat)("%iは%i枚になり、上限を超える", (no, _cards, program) => {
			const { maze, maxCards } = tutorial(no);
			expect(validateProgram(program, maxCards)).toEqual({
				ok: false,
				reason: { kind: "tooManyCards", limit: maxCards },
			});
			// 道としては正しい（上限がなければgoalになる）
			expect(compile(maze, program).outcome).toBe("goal");
		});
	});
});
