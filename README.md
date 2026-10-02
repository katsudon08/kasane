# KASANE

児童が QR カードをかざしてロボットをプログラムし、迷路のゴールを目指す、小学校向けのプログラミング教材です。
一台のロボットで解く **シングルモード** と、二人一組でそれぞれのロボットを動かす **ペアモード** があります。
教師は各児童・各ペアの進行状況を見て、支援が必要な児童に関わります。
[ProgPath](https://github.com/katsudon08/prog-path) の後継にあたります。

## Setup

必要なのは [mise](https://mise.jdx.dev/) だけです。
Node と Bun のバージョンは `mise.toml` が、pnpm のバージョンは `package.json` の `packageManager` が決めます。

```sh
mise install
pnpm install
pnpm dev
```

使えるコマンドは `package.json` の `scripts` を参照してください。

## ドキュメント

| 知りたいこと | 読む場所 |
| --- | --- |
| なぜ作るのか | [docs/concept.md](docs/concept.md) |
| 用語と英語名 | [GLOSSARY.md](GLOSSARY.md) |
| 授業中の児童の進行 | [docs/spec/student-flow.md](docs/spec/student-flow.md) |
| 授業中の教師の進行 | [docs/spec/teacher-flow.md](docs/spec/teacher-flow.md) |
| 迷路・ロボット・プログラムの仕様 | [docs/spec/maze.md](docs/spec/maze.md) / [docs/spec/robot.md](docs/spec/robot.md) / [docs/spec/program.md](docs/spec/program.md) |
| システム構成と技術選定 | [docs/architecture.md](docs/architecture.md) |
| 開発の進め方 | [CONTRIBUTING.md](CONTRIBUTING.md) |
