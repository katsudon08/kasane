# @kasane/core

迷路・命令カード・プログラム・コンパイル・進み具合・チュートリアルの純粋関数と型です。
DB・React・ブラウザAPIに依存せず、`dependencies`は空に保ちます。

仕様は[docs/specs/single/domain.md](../../docs/specs/single/domain.md)にあり、テストは仕様の表をそのままケースにしています。

| ファイル           | 中身                                                        |
| ------------------ | ----------------------------------------------------------- |
| `src/maze.ts`      | `Direction`・`Cell`・`Maze`の型、マスの定数、`validateMaze` |
| `src/card.ts`      | `Card`の型、`parseCard`、`isNewScan`                        |
| `src/program.ts`   | `Command`・`Program`の型、`validateProgram`                 |
| `src/compile.ts`   | `Step`・`CompileResult`の型、`compile`                      |
| `src/progress.ts`  | `isTutorialUnlocked`・`canCreateMaze`                       |
| `src/lesson.ts`    | `LESSON_DURATION_MS`・`lessonEndsAt`・`isLessonEnded`       |
| `src/tutorials.ts` | `Tutorial`の型、`TUTORIALS`                                 |

```sh
bun test       # packages/coreの中で
mise run test  # リポジトリ全体
```
