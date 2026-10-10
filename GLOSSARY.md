# GLOSSARY

本サービスのドメイン用語と、コードで使う英語名の対応表です。
英語名はファイル名・型名・識別子にそのまま使います。空白はファイル名ではハイフン、識別子ではキャメルケースに置き換えます。
定義や規則は「参照」の文書が正です。

## 人と単位

| 日本語         | 英語    | 説明                                           | 参照                                      |
| -------------- | ------- | ---------------------------------------------- | ----------------------------------------- |
| 児童           | student | 本サービスで迷路に取り組む小学生               | [student-flow](docs/spec/student-flow.md) |
| 教師           | teacher | 授業セッションを作り、児童を支援する人         | [teacher-flow](docs/spec/teacher-flow.md) |
| ペア           | pair    | 二人一組の児童。ペアモードで迷路に取り組む単位 | [student-flow](docs/spec/student-flow.md) |
| 授業セッション | session | 教師が作成する一回の授業の単位                 | [teacher-flow](docs/spec/teacher-flow.md) |

## 進行

| 日本語           | 英語         | 説明                                                             | 参照                                      |
| ---------------- | ------------ | ---------------------------------------------------------------- | ----------------------------------------- |
| モード           | mode         | 児童側の進め方の種類                                             | [student-flow](docs/spec/student-flow.md) |
| シングルモード   | single mode  | 一台のロボットで迷路を解くモード。ProgPath と同じ進め方          | [student-flow](docs/spec/student-flow.md) |
| ペアモード       | pair mode    | 二人一組でそれぞれのロボットを動かし、フェーズに沿って進むモード | [student-flow](docs/spec/student-flow.md) |
| 児童フロー       | student flow | 児童が授業中にたどる進め方                                       | [student-flow](docs/spec/student-flow.md) |
| フェーズ         | phase        | ペアモードの段階                                                 | [student-flow](docs/spec/student-flow.md) |
| 予測フェーズ     | predict      | 相手の動きを予測してプログラムを作る段階                         | [student-flow](docs/spec/student-flow.md) |
| 実装フェーズ     | implement    | 自分のプログラムを作る段階                                       | [student-flow](docs/spec/student-flow.md) |
| 説明フェーズ     | explain      | 互いの考えを口頭で説明する段階                                   | [student-flow](docs/spec/student-flow.md) |
| 実行フェーズ     | run          | 二つの世界を重ねて実行する段階                                   | [student-flow](docs/spec/student-flow.md) |
| 議論フェーズ     | discuss      | 差分をもとに改善の方針を話し合う段階                             | [student-flow](docs/spec/student-flow.md) |
| 振り返りフェーズ | reflect      | 予測と実際のプログラムを見比べる段階                             | [student-flow](docs/spec/student-flow.md) |
| ラウンド         | round        | 予測フェーズから議論フェーズまでの一巡                           | [student-flow](docs/spec/student-flow.md) |
| バリア同期       | barrier sync | ペアの二人がともに条件を満たすまで次のフェーズへ進めない仕組み   | [architecture](docs/architecture.md)      |

## 迷路

| 日本語   | 英語        | 説明                                               | 参照                        |
| -------- | ----------- | -------------------------------------------------- | --------------------------- |
| 迷路     | maze        | マスのグリッドと階層からなる盤面                   | [maze](docs/spec/maze.md)   |
| マス     | tile        | 迷路を構成する一単位                               | [maze](docs/spec/maze.md)   |
| 階層     | layer       | 迷路の階                                           | [maze](docs/spec/maze.md)   |
| スタート | start tile  | ロボットが最初に置かれるマス                       | [maze](docs/spec/maze.md)   |
| ゴール   | goal tile   | 通過するとクリアになるマス                         | [maze](docs/spec/maze.md)   |
| 床       | floor tile  | ロボットが移動できるマス                           | [maze](docs/spec/maze.md)   |
| 壁       | wall tile   | ぶつかるとゲームオーバーになるマス                 | [maze](docs/spec/maze.md)   |
| 穴       | hole tile   | 落ちるとゲームオーバーになるマス                   | [maze](docs/spec/maze.md)   |
| ボタン   | button tile | 相手の鍵のロックを外すマス                         | [maze](docs/spec/maze.md)   |
| 鍵       | key tile    | 自分のゴールのロックを外すマス                     | [maze](docs/spec/maze.md)   |
| ターン   | turn        | 二台のロボットがそれぞれコマンドを一つ実行する単位 | [robot](docs/spec/robot.md) |

## ロボット

| 日本語       | 英語        | 説明                                                     | 参照                        |
| ------------ | ----------- | -------------------------------------------------------- | --------------------------- |
| ロボット     | robot       | プログラムで迷路内を動く主体                             | [robot](docs/spec/robot.md) |
| ゴースト世界 | ghost world | 自分のプログラムと、自分が作った予測プログラムで動く世界 | [robot](docs/spec/robot.md) |
| 実体世界     | real world  | 自分と相手が実際に作ったプログラムで動く世界             | [robot](docs/spec/robot.md) |
| ゴースト     | ghost       | ゴースト世界のロボット                                   | [robot](docs/spec/robot.md) |
| 実体         | real        | 実体世界のロボット                                       | [robot](docs/spec/robot.md) |

## プログラム

| 日本語         | 英語              | 説明                                         | 参照                                      |
| -------------- | ----------------- | -------------------------------------------- | ----------------------------------------- |
| プログラム     | program           | コマンドの列。ロボット一台を動かす           | [program](docs/spec/program.md)           |
| コマンド       | command           | QR カード一枚に対応する命令                  | [program](docs/spec/program.md)           |
| QR カード      | QR card           | コマンドが印字された物理カード               | [program](docs/spec/program.md)           |
| 前にすすむ     | forward           | コマンドの一種                               | [program](docs/spec/program.md)           |
| 右にまがる     | turn right        | コマンドの一種                               | [program](docs/spec/program.md)           |
| 左にまがる     | turn left         | コマンドの一種                               | [program](docs/spec/program.md)           |
| 穴をうめる     | fill hole         | コマンドの一種                               | [program](docs/spec/program.md)           |
| くりかえす     | loop              | コマンドの一種                               | [program](docs/spec/program.md)           |
| おわり         | end               | コマンドの一種。くりかえすの範囲の終わり     | [program](docs/spec/program.md)           |
| 予測プログラム | predicted program | 相手のロボットの動きを予測して作るプログラム | [student-flow](docs/spec/student-flow.md) |
| ロック         | lock              | プログラムを変更できなくすること             | [student-flow](docs/spec/student-flow.md) |
| バージョン     | version           | ロックされた時点の予測プログラムの記録       | [student-flow](docs/spec/student-flow.md) |
| 手数           | steps             | 実行で消費したコマンドの数                   | [student-flow](docs/spec/student-flow.md) |
