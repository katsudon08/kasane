/*
 * チュートリアル2〜7の解答の例（docs/specs/single/domain.md「チュートリアル」の表）
 * 迷路を作れるのは全問クリアした後なので、主要な流れでは2〜7をAPIから直接クリアする
 * 型はdomain.md「プログラム」のCommandと同じ形
 */
type Command =
	| { type: "forward" }
	| { type: "right" }
	| { type: "left" }
	| { type: "fill" }
	| { type: "repeat"; times: number; body: Command[] };

type Program = Command[];

const forward: Command = { type: "forward" };
const right: Command = { type: "right" };
const left: Command = { type: "left" };
const fill: Command = { type: "fill" };

function times(count: number, command: Command): Command[] {
	return Array.from({ length: count }, () => command);
}

function repeat(count: number, body: Command[]): Command {
	return { type: "repeat", times: count, body };
}

export const TUTORIAL_SOLUTIONS: { no: number; program: Program }[] = [
	// 前×2、右、前×2、右、前×2
	{
		no: 2,
		program: [...times(2, forward), right, ...times(2, forward), right, ...times(2, forward)],
	},
	// 前×2、左、前×2、右、前×3
	{
		no: 3,
		program: [...times(2, forward), left, ...times(2, forward), right, ...times(3, forward)],
	},
	// うめる、前×3、うめる、前、右、前×2、うめる、前×2
	{
		no: 4,
		program: [
			fill,
			...times(3, forward),
			fill,
			forward,
			right,
			...times(2, forward),
			fill,
			...times(2, forward),
		],
	},
	// くりかえす3回［前］、右、くりかえす6回［前］
	{ no: 5, program: [repeat(3, [forward]), right, repeat(6, [forward])] },
	// 前、くりかえす5回［右、前、左、前］
	{ no: 6, program: [forward, repeat(5, [right, forward, left, forward])] },
	// くりかえす2回［くりかえす3回［うめる、前、前］、右］
	{ no: 7, program: [repeat(2, [repeat(3, [fill, forward, forward]), right])] },
];
