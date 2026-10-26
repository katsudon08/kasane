# KASANE

児童が QR カードをかざしてロボットをプログラムし、迷路のゴールを目指す、小学校向けのプログラミング教材です。
納期までに提供する対象は、一台のロボットで解く **シングルモード** です。二人一組でそれぞれのロボットを動かす **ペアモード** は将来の目標です。
児童はチュートリアルを順番に解き、すべて終えた後に自分で問題を作ります。
教師は各児童の進行状況を見て、支援が必要な児童に関わります。
[ProgPath](https://github.com/katsudon08/prog-path) の後継にあたります。

## Setup

必要なのは [mise](https://mise.jdx.dev/) だけです。
Node と Bun のバージョンは `mise.toml` が、pnpm のバージョンは `package.json` の `packageManager` が決めます。

```sh
mise install
pnpm install
mise run dev
```

使えるコマンドは `package.json` の `scripts` を参照してください。

## ドキュメント

| 知りたいこと           | 読む場所                                             |
| ---------------------- | ---------------------------------------------------- |
| なぜ作るのか           | [docs/concepts/README.md](docs/concepts/README.md)   |
| 用語と英語名           | [GLOSSARY.md](GLOSSARY.md)                           |
| シングルモードの仕様   | [docs/spec/single-mode.md](docs/spec/single-mode.md) |
| システム構成と技術選定 | [docs/architecture.md](docs/architecture.md)         |
| 開発の進め方           | [CONTRIBUTING.md](CONTRIBUTING.md)                   |
