# 迷路・命令カード・実行ルール

ここに書くものは、迷路の編集とカードの並びの編集（児童の端末だけが使うので`apps/student`に置く）を除き、すべて`packages/core`の純粋関数と型として実装します。
カードの読み取りと編集は児童の端末、コンパイル（`compile`）はサーバー、迷路の確認とチュートリアルは両方で使います。
DBや画面に依存しないので、表のケースをそのままテストにします。

## 迷路

```ts
type Direction = "north" | "east" | "south" | "west";
type Cell = "floor" | "wall" | "hole" | "start" | "goal" | "teleportUp" | "teleportDown" | "key";

type Maze = {
	layers: Cell[][][]; // layers[階][行][列]。0が1階、行は上から下、列は左から右。1〜3階、一辺5〜7マスの正方形
	startDirection: Direction; // ロボットが最初に向いている方向
};
```

スタートはマスの一種として置き、向きだけ`startDirection`で別に持ちます（座標も別に持つとマスとの二重管理になるため）。
`Direction`は保存と検証に使う値で、`compile`の中では`DIRECTION_VECTORS[direction]`のような表で`[dx, dy]`に直して計算します（`[1, 0]`のような値をそのまま保存すると、4方向のどれかであることをTypeBoxで表せないため）。

| マス           | ロボットが入ると                                                |
| -------------- | --------------------------------------------------------------- |
| `floor`        | 進める                                                          |
| `wall`         | ぶつかって止まる（失敗）                                        |
| `hole`         | 落ちる（失敗）                                                  |
| `start`        | 床と同じ                                                        |
| `goal`         | 鍵をすべて取っていればクリア。残っていれば失敗（`missingKeys`） |
| `teleportUp`   | 同じ行・列の一つ上の階へ移る                                    |
| `teleportDown` | 同じ行・列の一つ下の階へ移る                                    |
| `key`          | 鍵を取る（止まらない）                                          |

- 見た目は[README.md](README.md#迷路の3dしょうさいとプレイで共通)（3D）と[README.md](README.md#迷路の2dエディタとミニマップで共通)（2D）に書く
- 迷路の外側は`wall`として扱う
- 「穴をうめる」で埋めた穴は`floor`になる

### 迷路の正しさ（`validateMaze`）

- 正方形で、すべての階が同じ大きさ（行の数と各行のマスの数がすべて等しい）
- `start`と`goal`が、全階を合わせてそれぞれちょうど一つ
- `teleportUp`は上の階、`teleportDown`は下の階が存在し、同じ行・列の行き先のマスが`wall`・`hole`・`teleportUp`・`teleportDown`のどれでもない（テレポートは一方通行。戻る道は別に作る）

確かめないもの: ゴールまでたどり着けるか、鍵の数（0個でもよい）、`startDirection`が壁を向いていないか。

階の数と一辺の長さの範囲、マスの種類はTypeBoxで見ます（[backend.md](backend.md#入力の上限)）。
児童が作る迷路は、エディタの操作の関数でこの条件が崩れないようにします。サーバーでも保存前に同じ関数で確かめます。
エディタの操作の関数は児童の端末だけが使うので、`packages/core`ではなく`apps/student`のエディタの機能（`features`層）に置き、Vitestでテストします（[迷路の編集](#迷路の編集児童の端末)）。`Maze`・`Cell`の型と`validateMaze`は`core`から取り込みます。

### 迷路の編集（児童の端末）

`apps/student`のエディタの機能に置く純粋関数です。操作ごとに一つの関数にし、どれを呼ぶかは画面側が決めます（関数はタップの意味を知らない）。
すべての関数は、`ok: true`で返す`Maze`が必ず`validateMaze`を通ることを約束します。置けない・減らせないときは理由を返し、画面はそれを文言にして出します。

```ts
type Position = { layer: number; y: number; x: number };

type EditError =
	| "startCannotBeOverwritten" // スタートの上に別の道具を塗ろうとした
	| "goalCannotBeOverwritten" // ゴールの上に別の道具を塗ろうとした
	| "noLayerAbove" // 最上階にうえへテレポート
	| "noLayerBelow" // 1階にしたへテレポート
	| "teleportTargetBlocked" // テレポートの行き先のマスが壁・穴・テレポート
	| "isTeleportTarget" // 隣の階のテレポートの行き先のマスに壁・穴・テレポートを塗ろうとした
	| "maxLayers" // 3階より上に足そうとした
	| "minLayers" // 1階を減らそうとした
	| "layerHasStartOrGoal" // 減らす階にスタートかゴールがある
	| "layerIsTeleportTarget"; // 減らす階が、下の階のうえへテレポートの行き先

type EditResult = { ok: true; maze: Maze } | { ok: false; reason: EditError };

declare function createMaze(size: 5 | 6 | 7): Maze;
declare function placeCell(maze: Maze, cell: Cell, at: Position): EditResult;
declare function rotateStart(maze: Maze): Maze;
declare function addLayer(maze: Maze): EditResult;
declare function removeTopLayer(maze: Maze): EditResult;
```

| 関数             | すること                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `createMaze`     | 1階、すべて`FLOOR`、左上に`START`、右下に`GOAL`、`startDirection`は`east`                                                        |
| `placeCell`      | 断る条件を`EditError`の順に見る。通ったら`cell`を置く。置くのが`START`か`GOAL`なら前の場所を`FLOOR`に戻す。`KEY`は何個でも置ける |
| `rotateStart`    | `startDirection`を`east → south → west → north → east`に進める。断る条件はない                                                   |
| `addLayer`       | 3階なら断る。すべて`FLOOR`の階をいちばん上に足す                                                                                 |
| `removeTopLayer` | 1階なら断る。いちばん上に`START`か`GOAL`があれば断る。一つ下の階に`TELEPORT_UP`があれば断る。通ったらいちばん上を外す            |

- どの関数も元の`Maze`を書き換えない。変える階と行だけを複製し、残りは元の配列を共有した新しい`Maze`を返す（Reactの状態として差し替えるため）
- 画面側の割り当て: 選んでいる道具が`START`で、タップしたマスが`START`なら`rotateStart`。それ以外のタップは`placeCell`
- 大きさは`createMaze`のときだけ決め、後から変える関数は作らない
- 断る理由（`ok: false`）は想定内の結果なので、例外にせず値で返す。範囲外の`Position`のような呼び出し側の誤りだけ例外（`throw`）にする。例外は画面のエラーバウンダリーで受け止める（[README.md](README.md#うまく動かなかったときの受け止めエラーバウンダリー)）

テストは、`ok: true`で返った`Maze`が`validateMaze`を通ることを全操作で確かめ、断る条件ごとに`reason`が返ることを確かめます。

## 命令カード

| カード（児童画面の表示。「埋める」「繰り返す」は小学校で習わない漢字なのでひらがな） | コード                | QRの中身  |
| ------------------------------------------------------------------------------------ | --------------------- | --------- |
| <ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>む                         | `{ type: "forward" }` | `FORWARD` |
| <ruby>右<rt>みぎ</rt></ruby>に<ruby>曲<rt>ま</rt></ruby>がる                         | `{ type: "right" }`   | `RIGHT`   |
| <ruby>左<rt>ひだり</rt></ruby>に<ruby>曲<rt>ま</rt></ruby>がる                       | `{ type: "left" }`    | `LEFT`    |
| <ruby>穴<rt>あな</rt></ruby>をうめる                                                 | `{ type: "fill" }`    | `HOLE`    |
| くりかえす                                                                           | `{ type: "repeat" }`  | `LOOP`    |
| くりかえし<ruby>終<rt>お</rt></ruby>わり                                             | `{ type: "end" }`     | `END`     |

- `parseCard(text: string): Card | null` — 読み取った文字列の前後の空白を取り、上の表と比べる。合わなければ`null`（KASANEのカードでない）
- カードは6種類ともKASANEで新しく印刷する。前身ProgPathのカード（`forward`・`loop`など小文字、「終わり」なし）は使わない
- 「くりかえす」のカードは1種類。回数はカードではなく画面で決める（初期値2、2〜10）

### カードの読み取り

カメラは同じQRを1秒間に何度も読み取るので、次の規則で1回分だけ追加します。

- `isNewScan(text, now, lastSeenAt)`: 同じ中身のQRが最後に見えてから1500ms以上たっていれば受け付ける（ProgPathの学校での実証と同じ値）
- 読み取るたびに`lastSeenAt[text] = now`を更新する
- つまり、カードをかざし続けても1枚分しか増えず、一度外して（1.5秒以上）またかざすと増える

## プログラム

プログラムには二つの形があります。

| 形            | 型        | どこにあるか                                       |
| ------------- | --------- | -------------------------------------------------- |
| 読み取った1枚 | `Card`    | 読み取った瞬間だけ（すぐ木構造に入れる）           |
| 木構造        | `Program` | 児童の端末で編集し、サーバーへ送り、DBに保存する形 |

```ts
type Command =
	| { type: "forward" }
	| { type: "right" }
	| { type: "left" }
	| { type: "fill" }
	| { type: "repeat"; times: number; body: Command[] };

type Program = Command[];
```

- 「くりかえし終わり」は、くりかえしの範囲を閉じる印なので、木構造には残らない
- 木構造の中のある命令は、位置の配列`path`で指す（例:`[1, 0]`は「2つ目の命令の`body`の1つ目」）

### カードの並びの編集（児童の端末）

児童の端末は、読み取ったカードを一列にためるのではなく、木構造（`Program`）を直接編集します。「ロボットを動かす」を押したときに組み立て直す段階はなく、持っている木をそのまま送ります。
編集の関数は児童の端末だけが使うので、迷路の編集と同じく`apps/student`のプレイの機能（`features`層）に置き、Vitestでテストします。どれも元の`Program`を書き換えず、新しい`Program`を返します。

差し込み位置（`Cursor`）は「どの`body`の何番目に入れるか」を表す`path`です。最初は一番外側の末尾にあります。

| 操作                             | すること                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 前・右・左・うめるを読み取った   | 差し込み位置にその命令を入れ、差し込み位置をその直後に進める                                                               |
| くりかえすを読み取った           | `{ type: "repeat", times: 2, body: [] }`を入れ、差し込み位置をその`body`の先頭に移す（回数の初期値は2）                    |
| くりかえし終わりを読み取った     | 差し込み位置がくりかえしの`body`の中なら、そのくりかえしの直後に移す。中でなければ何もせず文言を出す（`endOutsideRepeat`） |
| カードの下の出っ張りをタップした | 差し込み位置をそのカードの直後（同じ`body`の中）に移す。くりかえしの`body`の末尾にも出っ張りがあり、中の末尾を選べる       |
| ゴミ箱をタップした               | その命令を消す。くりかえしなら`body`ごと消す。差し込み位置がその中にあれば、消した場所に移す                               |
| くりかえしの回数を変えた         | `times`を2〜10の中で変える（モーダルの「＜」「＞」。2で「＜」、10で「＞」を押せなくする）                                  |

```ts
type Cursor = number[]; // 入れる場所。[1, 0]は「2つ目の命令のbodyの先頭」

declare function insertCard(
	program: Program,
	cursor: Cursor,
	card: Card,
): { program: Program; cursor: Cursor };
declare function removeCommand(
	program: Program,
	path: number[],
): { program: Program; cursor: Cursor };
declare function setRepeatTimes(program: Program, path: number[], times: number): Program;
declare function commandIndex(program: Program, path: number[]): number; // 木を上から数えた番号（1始まり）。画面の番号と文言の{n}に使う
```

- 枚数の上限と入れ子の深さは、入れる前に`validateProgram`で確かめ、超えるなら入れずに文言を出す
- サーバーは、届いた木構造を型（TypeBox）で検証します。木構造として成り立っているものしか受け付けないので、サーバーで編集の失敗を扱うことはありません

### プログラムの正しさ（`validateProgram`）

木構造の大きさを確かめます。端末ではカードを入れる前に呼び、超えるなら入れずに文言を出します。サーバーでは型の検証のあと、`compile`の前に同じ関数を呼び、だめなら`422`を返します（端末が先に止めるので、ふつうは起きません）。

| 状況                                                | 結果                                      |
| --------------------------------------------------- | ----------------------------------------- |
| 木構造の命令の数が`MAX_COMMANDS`（100）より多い     | `{ kind: "tooManyCommands", limit: 100 }` |
| 問題の上限枚数（`maxCards`）より多い                | `{ kind: "tooManyCards", limit }`         |
| くりかえしの入れ子が`MAX_REPEAT_DEPTH`（3）より深い | `{ kind: "tooDeep", limit: 3 }`           |

- 命令の数は、木構造のすべての`Command`の数（`repeat`も1つと数え、`body`の中も数える）
- カードの枚数は、命令の数に`repeat`の数を足したもの（「くりかえし終わり」の分）。`maxCards`はチュートリアルごとの値で、ないチュートリアルと自分の迷路は`null`（上限なし）
- 入れ子の深さは、`repeat`の`body`の中の`repeat`を2段、その中をさらに3段と数える。4段目で`tooDeep`
- `times`の範囲（2〜10）は型の検証（TypeBox）で見るので、ここでは見ない

100は、`compile`の200ターンの上限とは別の、受け付ける本文の大きさの上限です。3は、対象が小学校の中学年から高学年で、深い入れ子を教える意図がないためです。

## コンパイル（`compile`）

サーバーで、木構造と迷路から、ロボットが各ターンにどこにいるかを計算します。結果（`CompileResult`）は送った児童にだけ`201`で返し、DBには保存しません（`succeeded`だけを`attempts`に入れる）。教師には`CompileResult`ではなく、`succeeded`から求めた`StudentStatus`が届きます。端末は返ってきた`steps`をなぞって3Dを動かし、自分では`compile`し直しません（判定と画面の動きを必ず一致させるため）。

```ts
type Step = {
	layer: number; // このターンの後の位置（テレポートした後の階）
	x: number; // 列。左が0
	y: number; // 行。上が0
	direction: Direction; // このターンの後の向き（その場で回るターンを描くために必要）
	path: number[]; // このターンで実行した命令の、木構造の中の位置。端末はcommandIndexでカードの番号に直す
	event: "move" | "turn" | "fill" | "fillMiss" | "bump" | "fall" | "goal"; // そのターンにロボットがしたこと（3Dの動きを選ぶ）
	filled?: { layer: number; x: number; y: number }; // 穴をうめたマス
	teleported?: boolean; // 進んだ先がテレポートで、隣の階へ移った
	tookKey?: boolean; // 進んだ先（テレポート後も含む）で鍵を取った
};

type CompileResult = {
	steps: Step[]; // 1ターン目から順に
	outcome: "goal" | "bump" | "fall" | "missingKeys" | "notReached" | "tooLong";
};

declare function compile(maze: Maze, program: Program): CompileResult;
```

`outcome === "goal"`なら成功、それ以外は失敗です。DBには成功したかどうか（boolean）だけを保存します。

### 1ターンの動き

| 命令       | 動き                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 前にすすむ | 向いている方向へ同じ階の1マス進む。先が`wall`または迷路の外なら`bump`（位置は変わらない）。`hole`なら進んで`fall`。`goal`なら進んで`goal`。`key`なら進んで鍵を取る（`tookKey`。そのマスはコンパイルの中だけで`floor`になる）。`teleportUp`・`teleportDown`なら進んだ後に同じ行・列の隣の階へ移り（`teleported`）、移った先のマスをもう一度見る（鍵なら取る、`goal`なら`goal`）。`start`・`floor`は同じ扱い |
| 右にまがる | その場で右に90度向きを変える（進まない）                                                                                                                                                                                                                                                                                                                                                                   |
| 左にまがる | その場で左に90度向きを変える（進まない）                                                                                                                                                                                                                                                                                                                                                                   |
| 穴をうめる | 向いている方向の、同じ階の1マス先が`hole`なら`floor`にする（`fill`）。穴でなければ何も起きず次へ進む（`fillMiss`。1ターンとして数える。ProgPathと同じ）                                                                                                                                                                                                                                                    |
| くりかえす | `body`の命令を`times`回くりかえす。くりかえす自体は1ターンを使わない                                                                                                                                                                                                                                                                                                                                       |

### 成功・失敗の判定

始まりの位置は`start`のマス、向きは`startDirection`です。1ターン目から順に動かし、次のどれかに当たった時点で終わります。

| 順に確かめること                       | 結果                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| 壁（または迷路の外）にぶつかった       | `bump`（失敗）                                                                     |
| 穴に落ちた                             | `fall`（失敗）                                                                     |
| 鍵が残ったままゴールに着いた           | `missingKeys`（失敗）。最後の`Step`の`event`は`goal`のまま。残りの命令は実行しない |
| 鍵をすべて取ってゴールに着いた         | `goal`（成功）。残りの命令は実行しない                                             |
| ターン数が200を超えた                  | `tooLong`（失敗）。入れ子のくりかえしで長くなりすぎるのを防ぐ                      |
| 最後の命令まで実行してもゴールにいない | `notReached`（失敗）                                                               |

- `compile`は元の`maze`を書き換えない（埋めた穴と取った鍵はコンパイルの中だけの状態）
- 鍵が0個の迷路では、ゴールに着けばそのまま`goal`
- 鍵が残ったままゴールを通り抜けることはできない（ゴールを`floor`として扱わない）。鍵を先に取らせたい迷路は、ゴールの手前に鍵を置いて作る
- `bump`と`fall`では、失敗した命令は`steps`の最後の要素の`path`で分かる。`tooLong`は200ターン目まで実行して止めるので、最後の要素は原因の命令ではない

### 児童画面の文言

`{n}`は原因のカードの番号（1始まり。`path`から`commandIndex`で求める）。文言は児童画面に出すもので、漢字は小学6年生までのもの、ルビは`<ruby>`で書く（[README.md](README.md#文言のルール)）。「枚」「壁」「鍵」は小学校で習わないのでひらがな。

| 結果               | 児童画面の文言                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `goal`             | ゴールに<ruby>着<rt>つ</rt></ruby>いた！                                                                                                                                  |
| `bump`             | {n}まい<ruby>目<rt>め</rt></ruby>のカードで、かべにぶつかったよ。<ruby>赤<rt>あか</rt></ruby>いカードのあたりを<ruby>見直<rt>みなお</rt></ruby>そう                       |
| `fall`             | {n}まい<ruby>目<rt>め</rt></ruby>のカードで、<ruby>穴<rt>あな</rt></ruby>に<ruby>落<rt>お</rt></ruby>ちたよ。「<ruby>穴<rt>あな</rt></ruby>をうめる」カードでうめられるよ |
| `notReached`       | カードが<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>終<rt>お</rt></ruby>わったけど、ゴールに<ruby>着<rt>つ</rt></ruby>いていないよ。カードを<ruby>足<rt>た</rt></ruby>そう      |
| `missingKeys`      | かぎを<ruby>全部<rt>ぜんぶ</rt></ruby><ruby>取<rt>と</rt></ruby>ってからゴールしよう                                                                                      |
| `tooLong`          | <ruby>動<rt>うご</rt></ruby>きが<ruby>多<rt>おお</rt></ruby>すぎるよ。「くりかえす」の<ruby>回数<rt>かいすう</rt></ruby>を<ruby>見直<rt>みなお</rt></ruby>そう            |
| `tooManyCards`     | この<ruby>問題<rt>もんだい</rt></ruby>では、カードは{limit}まいまでだよ                                                                                                   |
| `tooManyCommands`  | カードが<ruby>多<rt>おお</rt></ruby>すぎるよ。{limit}<ruby>個<rt>こ</rt></ruby>までにしてね                                                                               |
| `tooDeep`          | 「くりかえす」の<ruby>中<rt>なか</rt></ruby>の「くりかえす」は、{limit}つまでだよ                                                                                         |
| `endOutsideRepeat` | 「くりかえし<ruby>終<rt>お</rt></ruby>わり」は、「くりかえす」の<ruby>中<rt>なか</rt></ruby>でだけ<ruby>使<rt>つか</rt></ruby>えるよ                                      |

`tooManyCards`以下は大きさ（`validateProgram`）か編集の失敗なので、サーバーへ送らずに「つくる」のまま表示します。

## 進み具合のルール

- `isTutorialUnlocked(no, clearedCount)`: `no <= clearedCount + 1`
- `canCreateMaze(clearedCount)`: `clearedCount >= TUTORIALS.length`
- クリア数（`clearedCount`）は保存せず、送った記録から数える（[backend.md](backend.md#教師に見せる状態の求め方)）

## 授業の終わり

- `LESSON_DURATION_MS`: 5時間。午前の4コマと休み時間に、1時間の余裕を足した長さ
- `lessonEndsAt(createdAt)`: `createdAt + LESSON_DURATION_MS`。授業を作るときに`lessons.endsAt`に入れる
- `isLessonEnded(lesson, now)`: `lesson.endsAt <= now`

## チュートリアル

`packages/core`に定数として持ちます（DBには入れません）。チュートリアルの迷路も児童が作る迷路と同じ`Maze`の決まり（正方形、一辺5〜7、1〜3階、`validateMaze`を通る）に従います。
迷路は`Maze`の`layers`をそのまま配列で書きます。文字列の記号から変換する関数は作りません（変換の実装とテストが増え、未知の記号は実行時にしか分からないため）。
読みやすさのために、`Cell`の値ごとに大文字の定数を`packages/core`に置き、迷路もテストもその定数で書きます。

```ts
export const FLOOR: Cell = "floor";
export const WALL: Cell = "wall";
export const HOLE: Cell = "hole";
export const START: Cell = "start";
export const GOAL: Cell = "goal";
export const TELEPORT_UP: Cell = "teleportUp";
export const TELEPORT_DOWN: Cell = "teleportDown";
export const KEY: Cell = "key";

// 1問目の例
const layers: Cell[][][] = [
	[
		[START, FLOOR, FLOOR, GOAL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
	],
];
```

階数は、1〜4問目が1階、5〜7問目が2階です。1階だけの問題でカードの使い方を一つずつ覚え、後半でテレポートで階を移る迷路にして、少しずつ難しくします。

| No  | 名前                                                             | 新しく出るもの               | 階  | 大きさ | スタートの向き | 枚数の上限 | 解答の例                                             |
| --- | ---------------------------------------------------------------- | ---------------------------- | --- | ------ | -------------- | ---------- | ---------------------------------------------------- |
| 1   | <ruby>前<rt>まえ</rt></ruby>に<ruby>進<rt>すす</rt></ruby>もう   | 前にすすむ                   | 1   | 5×5    | `east`         | なし       | 前×4                                                 |
| 2   | <ruby>右<rt>みぎ</rt></ruby>に<ruby>曲<rt>ま</rt></ruby>がろう   | 右にまがる                   | 1   | 5×5    | `east`         | なし       | 前×2、右、前×2、右、前×2                             |
| 3   | <ruby>左<rt>ひだり</rt></ruby>に<ruby>曲<rt>ま</rt></ruby>がろう | 左にまがる                   | 1   | 6×6    | `east`         | なし       | 前×2、左、前×2、右、前×3                             |
| 4   | <ruby>穴<rt>あな</rt></ruby>をうめよう                           | 穴をうめる                   | 1   | 6×6    | `east`         | なし       | うめる、前×3、うめる、前、右、前×2、うめる、前×2     |
| 5   | くりかえしを<ruby>使<rt>つか</rt></ruby>おう                     | くりかえす、テレポートのマス | 2   | 7×7    | `east`         | 7          | くりかえす3回［前］、右、くりかえす6回［前］         |
| 6   | かぎを<ruby>取<rt>と</rt></ruby>ってゴールしよう                 | くりかえし＋まがる、鍵のマス | 2   | 7×7    | `east`         | 7          | 前、くりかえす5回［右、前、左、前］                  |
| 7   | くりかえしで<ruby>穴<rt>あな</rt></ruby>をうめよう               | くりかえしの入れ子＋うめる   | 2   | 7×7    | `east`         | 8          | くりかえす2回［くりかえす3回［うめる、前、前］、右］ |

- 大きさは1〜2問目が5×5、3〜4問目が6×6、5〜7問目が7×7と少しずつ広げる。通る道以外はすべて`WALL`で、飾りのマスは置かない
- 5〜7は枚数の上限を付け、「くりかえす」を使わないと解けないようにする。くりかえしなしの枚数は5が10枚、6が21枚、7が11枚
- 7は、入れ子にしないと11枚で上限8を超えるので、くりかえしの中のくりかえしが要る。2回目の「右」の前にゴールに着き、残りは実行しない
- 5でテレポートのマス、6で鍵のマスが初めて出る。どちらもカードは増えない
- 迷路は`START`のマスと`startDirection`から始まる。`x`は列（左が0）、`y`は行（上が0）、`east`は`x`が増える向き、`south`は`y`が増える向き

```ts
// 1 まえにすすもう
layers: [
	[
		[START, FLOOR, FLOOR, FLOOR, GOAL],
		[WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
	],
];

// 2 右にまがろう
layers: [
	[
		[START, FLOOR, FLOOR, WALL, WALL],
		[WALL, WALL, FLOOR, WALL, WALL],
		[GOAL, FLOOR, FLOOR, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL],
	],
];

// 3 左にまがろう
layers: [
	[
		[WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, FLOOR, FLOOR, FLOOR, GOAL],
		[WALL, WALL, FLOOR, WALL, WALL, WALL],
		[START, FLOOR, FLOOR, WALL, WALL, WALL],
	],
];

// 4 あなをうめよう
layers: [
	[
		[START, HOLE, FLOOR, FLOOR, HOLE, WALL],
		[WALL, WALL, WALL, WALL, FLOOR, WALL],
		[WALL, WALL, WALL, WALL, FLOOR, WALL],
		[WALL, WALL, WALL, WALL, HOLE, WALL],
		[WALL, WALL, WALL, WALL, GOAL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL],
	],
];

// 5 くりかえしをつかおう
layers: [
	[
		[START, FLOOR, FLOOR, FLOOR, WALL, WALL, WALL],
		[WALL, WALL, WALL, FLOOR, WALL, WALL, WALL],
		[WALL, WALL, WALL, FLOOR, WALL, WALL, WALL],
		[WALL, WALL, WALL, TELEPORT_UP, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
	],
	[
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, FLOOR, WALL, WALL, WALL],
		[WALL, WALL, WALL, FLOOR, WALL, WALL, WALL],
		[WALL, WALL, WALL, FLOOR, WALL, WALL, WALL],
		[WALL, WALL, WALL, GOAL, WALL, WALL, WALL],
	],
];

// 6 かぎをとってゴールしよう
layers: [
	[
		[START, FLOOR, WALL, WALL, WALL, WALL, WALL],
		[WALL, FLOOR, FLOOR, WALL, WALL, WALL, WALL],
		[WALL, WALL, TELEPORT_UP, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
	],
	[
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, FLOOR, FLOOR, WALL, WALL, WALL],
		[WALL, WALL, WALL, FLOOR, KEY, WALL, WALL],
		[WALL, WALL, WALL, WALL, FLOOR, FLOOR, WALL],
		[WALL, WALL, WALL, WALL, WALL, FLOOR, GOAL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
	],
];

// 7 くりかえしであなをうめよう
layers: [
	[
		[START, HOLE, FLOOR, HOLE, FLOOR, HOLE, TELEPORT_UP],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
		[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
	],
	[
		[WALL, WALL, WALL, WALL, WALL, WALL, FLOOR],
		[WALL, WALL, WALL, WALL, WALL, WALL, HOLE],
		[WALL, WALL, WALL, WALL, WALL, WALL, FLOOR],
		[WALL, WALL, WALL, WALL, WALL, WALL, HOLE],
		[WALL, WALL, WALL, WALL, WALL, WALL, FLOOR],
		[WALL, WALL, WALL, WALL, WALL, WALL, HOLE],
		[WALL, WALL, WALL, WALL, WALL, WALL, GOAL],
	],
];
```

- 解答の例は`packages/core`のテストで、実際に`goal`になることを確かめる
