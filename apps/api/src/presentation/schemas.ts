/*
 * HTTPのAPIの入力と応答のスキーマ（仕様書backend.mdの「HTTPのAPI」「エラーの応答」「入力の上限」）
 * 応答のIDは、何のIDかが分かる名前（lessonId・mazeId）にする
 */
import { MAX_COMMANDS, TUTORIALS } from "@kasane/core";
import { t } from "elysia";

// 知らない項目が付いた入力は落とす（DBにそのまま入れるprogramとdataに、余計な値を入れさせない）
const STRICT = { additionalProperties: false };

/*
 * 入力
 */

// 改行と制御文字を弾く（教師のカードの表示を崩さないため）
const NAME_PATTERN = "^[^\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029]*$";

// 名前と迷路の名前。前後の空白を削った後（trimmedName）の値を、1〜20文字で受け付ける
export const nameInput = t.String({ minLength: 1, maxLength: 20, pattern: NAME_PATTERN });

// DBのuuid型にそのまま渡せる形だけを通す（formatの"uuid"はurn:uuid:付きも通すので使わない）
const idInput = t.String({
	pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
});

const direction = t.Union([
	t.Literal("north"),
	t.Literal("east"),
	t.Literal("south"),
	t.Literal("west"),
]);

const cell = t.Union([
	t.Literal("floor"),
	t.Literal("wall"),
	t.Literal("hole"),
	t.Literal("start"),
	t.Literal("goal"),
	t.Literal("teleportUp"),
	t.Literal("teleportDown"),
	t.Literal("key"),
]);

// 1〜3階、各階は5〜7行、各行は5〜7マス。正方形かどうかと迷路のルールはvalidateMazeで見る
const SIDE = { minItems: 5, maxItems: 7 };
const mazeData = t.Object(
	{
		layers: t.Array(t.Array(t.Array(cell, SIDE), SIDE), { minItems: 1, maxItems: 3 }),
		startDirection: direction,
	},
	STRICT,
);

// 木構造の形と、くりかえしの回数（2〜10）。命令の数・枚数・入れ子の深さはvalidateProgramで見る
// 一つの配列がMAX_COMMANDSを超えれば命令の数も必ず超えるので、配列の長さだけはここでも止める
const COMMANDS = { maxItems: MAX_COMMANDS };
const command = t.Recursive((self) =>
	t.Union([
		t.Object({ type: t.Literal("forward") }, STRICT),
		t.Object({ type: t.Literal("right") }, STRICT),
		t.Object({ type: t.Literal("left") }, STRICT),
		t.Object({ type: t.Literal("fill") }, STRICT),
		t.Object(
			{
				type: t.Literal("repeat"),
				times: t.Integer({ minimum: 2, maximum: 10 }),
				body: t.Array(self, COMMANDS),
			},
			STRICT,
		),
	]),
);

export const lessonParams = t.Object({ lessonId: idInput });
export const mazeParams = t.Object({ mazeId: idInput });
// 1から始まるチュートリアルの番号
export const tutorialParams = t.Object({
	no: t.Integer({ minimum: 1, maximum: TUTORIALS.length }),
});

export const joinLessonInput = t.Object({ lessonId: idInput, name: nameInput }, STRICT);
export const attemptInput = t.Object({ program: t.Array(command, COMMANDS) }, STRICT);
// 問題を飛ばす先。to問目から始める（2〜チュートリアルの数＋1。＋1は全部飛ばす）
export const skipInput = t.Object(
	{ to: t.Integer({ minimum: 2, maximum: TUTORIALS.length + 1 }) },
	STRICT,
);
export const mazeInput = t.Object({ name: nameInput, data: mazeData }, STRICT);

/*
 * 応答
 */

// 時刻はISO 8601の文字列で返す
const timestamp = t.String({ format: "date-time" });

export const tokenBody = t.Object({ token: t.String() });
export const lessonIdBody = t.Object({ lessonId: t.String({ format: "uuid" }) });
export const openLessonsBody = t.Array(
	t.Object({
		lessonId: t.String({ format: "uuid" }),
		createdAt: timestamp,
		studentCount: t.Integer({ minimum: 0 }),
	}),
);
export const lessonBody = t.Object({ createdAt: timestamp });

export const meBody = t.Object({ name: t.String(), clearedCount: t.Integer({ minimum: 0 }) });
export const mazesBody = t.Array(
	t.Object({
		mazeId: t.String({ format: "uuid" }),
		name: t.String(),
		data: mazeData,
		updatedAt: timestamp,
	}),
);
export const mazeIdBody = t.Object({ mazeId: t.String({ format: "uuid" }) });

const position = { layer: t.Integer(), x: t.Integer(), y: t.Integer() };

// domain.mdのCompileResult
export const compileResultBody = t.Object({
	steps: t.Array(
		t.Object({
			...position,
			direction,
			path: t.Array(t.Integer()),
			event: t.Union([
				t.Literal("move"),
				t.Literal("turn"),
				t.Literal("fill"),
				t.Literal("fillMiss"),
				t.Literal("bump"),
				t.Literal("fall"),
				t.Literal("goal"),
			]),
			filled: t.Optional(t.Object(position)),
			teleported: t.Optional(t.Boolean()),
			tookKey: t.Optional(t.Boolean()),
		}),
	),
	outcome: t.Union([
		t.Literal("goal"),
		t.Literal("bump"),
		t.Literal("fall"),
		t.Literal("missingKeys"),
		t.Literal("notReached"),
		t.Literal("tooLong"),
	]),
});

// backend.mdのStudentStatus（教師に見せる児童の状態）
export const studentStatusBody = t.Object({
	studentId: t.String({ format: "uuid" }),
	name: t.String(),
	clearedCount: t.Integer({ minimum: 0, maximum: TUTORIALS.length }),
	lastResult: t.Union([t.Literal("notSent"), t.Literal("succeeded"), t.Literal("failed")]),
});

// サーバーからの知らせ（SSE）。受け取り口が1件ずつ流す値で、テストが届いた知らせの形を確かめるのに使う
const endedEvent = t.Object({ event: t.Literal("ended"), data: t.Null() });
// 接続を切られないための空の知らせ
const pingEvent = t.Object({ event: t.Literal("ping"), data: t.Null() });

export const teacherEventBody = t.Union([
	t.Object({ event: t.Literal("snapshot"), data: t.Array(studentStatusBody) }),
	t.Object({ event: t.Literal("student"), data: studentStatusBody }),
	endedEvent,
	pingEvent,
]);
// 児童用には、他の児童の状態を流さない
export const studentEventBody = t.Union([endedEvent, pingEvent]);

// エラーは状態とコードだけを返し、画面に出す文言は返さない
const errorBody = <Code extends string>(code: Code) => t.Object({ code: t.Literal(code) });

export const notFoundBody = errorBody("notFound");
export const lessonEndedBody = errorBody("lessonEnded");
export const invalidInputBody = errorBody("invalidInput");
export const mazeLockedBody = errorBody("mazeLocked");
export const tutorialLockedBody = errorBody("tutorialLocked");
export const lessonFullBody = errorBody("lessonFull");
