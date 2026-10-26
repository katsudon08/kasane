# GLOSSARY

本サービスのドメイン用語と、コードで使う英語名の対応表です。
英語名はファイル名・型名・識別子にそのまま使います。空白はファイル名ではハイフン、識別子ではキャメルケースに置き換えます。
定義や規則は「参照」の文書が正です。ペアモードに関する語は将来向けの旧仕様を参照し、現在の実装対象には含めません。

## 人と単位

| 日本語         | 英語    | 説明                                           | 参照                                             |
| -------------- | ------- | ---------------------------------------------- | ------------------------------------------------ |
| 児童           | student | 本サービスで迷路に取り組む小学生               | [single-mode](docs/spec/single-mode.md)          |
| 教師           | teacher | 授業セッションを作り、児童を支援する人         | [single-mode](docs/spec/single-mode.md)          |
| ペア           | pair    | 二人一組の児童。ペアモードで迷路に取り組む単位 | [student-flow](docs/legacy-spec/student-flow.md) |
| 授業セッション | session | 教師が作成する一回の授業の単位                 | [single-mode](docs/spec/single-mode.md)          |

## 進行

| 日本語           | 英語         | 説明                                                             | 参照                                             |
| ---------------- | ------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| モード           | mode         | 児童側の進め方の種類                                             | [single-mode](docs/spec/single-mode.md)          |
| シングルモード   | single mode  | 一台のロボットで迷路を解くモード。ProgPath と同じ進め方          | [single-mode](docs/spec/single-mode.md)          |
| ペアモード       | pair mode    | 二人一組でそれぞれのロボットを動かし、フェーズに沿って進むモード | [student-flow](docs/legacy-spec/student-flow.md) |
| 児童フロー       | student flow | 児童が授業中にたどる進め方                                       | [single-mode](docs/spec/single-mode.md)          |
| フェーズ         | phase        | ペアモードの段階                                                 | [student-flow](docs/legacy-spec/student-flow.md) |
| 予測フェーズ     | predict      | 相手の動きを予測してプログラムを作る段階                         | [student-flow](docs/legacy-spec/student-flow.md) |
| 実装フェーズ     | implement    | 自分のプログラムを作る段階                                       | [student-flow](docs/legacy-spec/student-flow.md) |
| 説明フェーズ     | explain      | 互いの考えを口頭で説明する段階                                   | [student-flow](docs/legacy-spec/student-flow.md) |
| 実行フェーズ     | run          | 二つの世界を重ねて実行する段階                                   | [student-flow](docs/legacy-spec/student-flow.md) |
| 議論フェーズ     | discuss      | 差分をもとに改善の方針を話し合う段階                             | [student-flow](docs/legacy-spec/student-flow.md) |
| 振り返りフェーズ | reflect      | 予測と実際のプログラムを見比べる段階                             | [student-flow](docs/legacy-spec/student-flow.md) |
| ラウンド         | round        | 予測フェーズから議論フェーズまでの一巡                           | [student-flow](docs/legacy-spec/student-flow.md) |
| バリア同期       | barrier sync | ペアの二人がともに条件を満たすまで次のフェーズへ進めない仕組み   | [architecture](docs/architecture.md)             |

## 迷路

| 日本語       | 英語          | 説明                                               | 参照                                    |
| ------------ | ------------- | -------------------------------------------------- | --------------------------------------- |
| 迷路         | maze          | マスのグリッドと階層からなる盤面                   | [single-mode](docs/spec/single-mode.md) |
| マス         | tile          | 迷路を構成する一単位                               | [single-mode](docs/spec/single-mode.md) |
| 階層         | layer         | 迷路の階                                           | [single-mode](docs/spec/single-mode.md) |
| スタート     | start tile    | ロボットが最初に置かれるマス                       | [single-mode](docs/spec/single-mode.md) |
| ゴール       | goal tile     | 通過するとクリアになるマス                         | [single-mode](docs/spec/single-mode.md) |
| 床           | floor tile    | ロボットが移動できるマス                           | [single-mode](docs/spec/single-mode.md) |
| 壁           | wall tile     | ぶつかるとゲームオーバーになるマス                 | [single-mode](docs/spec/single-mode.md) |
| 穴           | hole tile     | 落ちるとゲームオーバーになるマス                   | [single-mode](docs/spec/single-mode.md) |
| 上階への移動 | teleport up   | 同じ行・列の一つ上の階へ移るマス                   | [single-mode](docs/spec/single-mode.md) |
| 下階への移動 | teleport down | 同じ行・列の一つ下の階へ移るマス                   | [single-mode](docs/spec/single-mode.md) |
| ボタン       | button tile   | 相手の鍵のロックを外すマス                         | [maze](docs/legacy-spec/maze.md)        |
| 鍵           | key tile      | 自分のゴールのロックを外すマス                     | [maze](docs/legacy-spec/maze.md)        |
| ターン       | turn          | 二台のロボットがそれぞれコマンドを一つ実行する単位 | [robot](docs/legacy-spec/robot.md)      |

## ロボット

| 日本語       | 英語        | 説明                                                     | 参照                                    |
| ------------ | ----------- | -------------------------------------------------------- | --------------------------------------- |
| ロボット     | robot       | プログラムで迷路内を動く主体                             | [single-mode](docs/spec/single-mode.md) |
| ゴースト世界 | ghost world | 自分のプログラムと、自分が作った予測プログラムで動く世界 | [robot](docs/legacy-spec/robot.md)      |
| 実体世界     | real world  | 自分と相手が実際に作ったプログラムで動く世界             | [robot](docs/legacy-spec/robot.md)      |
| ゴースト     | ghost       | ゴースト世界のロボット                                   | [robot](docs/legacy-spec/robot.md)      |
| 実体         | real        | 実体世界のロボット                                       | [robot](docs/legacy-spec/robot.md)      |

## プログラム

| 日本語         | 英語              | 説明                                         | 参照                                             |
| -------------- | ----------------- | -------------------------------------------- | ------------------------------------------------ |
| プログラム     | program           | コマンドの列。ロボット一台を動かす           | [single-mode](docs/spec/single-mode.md)          |
| コマンド       | command           | QR カード一枚に対応する命令                  | [single-mode](docs/spec/single-mode.md)          |
| QR カード      | QR card           | コマンドが印字された物理カード               | [single-mode](docs/spec/single-mode.md)          |
| 前にすすむ     | forward           | コマンドの一種                               | [single-mode](docs/spec/single-mode.md)          |
| 右にまがる     | turn right        | コマンドの一種                               | [single-mode](docs/spec/single-mode.md)          |
| 左にまがる     | turn left         | コマンドの一種                               | [single-mode](docs/spec/single-mode.md)          |
| 穴をうめる     | fill hole         | コマンドの一種                               | [single-mode](docs/spec/single-mode.md)          |
| くりかえす     | loop              | コマンドの一種                               | [single-mode](docs/spec/single-mode.md)          |
| おわり         | end               | コマンドの一種。くりかえすの範囲の終わり     | [single-mode](docs/spec/single-mode.md)          |
| 予測プログラム | predicted program | 相手のロボットの動きを予測して作るプログラム | [student-flow](docs/legacy-spec/student-flow.md) |
| ロック         | lock              | プログラムを変更できなくすること             | [student-flow](docs/legacy-spec/student-flow.md) |
| バージョン     | version           | ロックされた時点の予測プログラムの記録       | [student-flow](docs/legacy-spec/student-flow.md) |
| 手数           | steps             | 実行で消費したコマンドの数                   | [student-flow](docs/legacy-spec/student-flow.md) |
