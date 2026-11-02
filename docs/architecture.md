# アーキテクチャ

本サービスの構成と、採用する技術を記します。

## システム構成

```
児童A ブラウザ --- バリア同期 --- 児童B ブラウザ    教師 ブラウザ
 (apps/student)                  (apps/student)   (apps/teacher)
     |                              |               |
     +------------------------------+---------------+
                              |
                             WSS
                              |
                     サーバー (apps/api, 1 プロセス)
                              |
                          データベース
```

ペアとなる児童同士の間に直接の接続はなく、**すべての通信はサーバーを経由します**。教師も同じサーバーに接続します。
児童と教師は、手入力ではなく**QRコード**を読み取って識別します。

## 各領域の責務

### 児童ブラウザ（apps/student）

- 児童の操作を受け取り、サーバーへ送信する
- サーバーから受け取った状態・結果を描画する

### 教師ブラウザ（apps/teacher）

- 教師の操作を受け取り、サーバーへ送信する
- サーバーから受け取った各ペアの状態を描画する

### サーバー（apps/api）

- 児童用・教師用の接続を受け付け、接続状態を管理する
- 児童フローの進行状態を判断し、ペアの進行を**バリア同期**する
- プログラムを解釈・実行し、結果を生成する
- 利用者ごとに送信してよい情報を判断し、配信する
- 接続に関する一時的な情報をメモリ上に保持する

### データベース

- 児童フローの進行状態を正本（SoT）として保持する
- プログラムや学習履歴を永続化する

## リポジトリ構成

パッケージ名のスコープは`@kasane`とします。

```
kasane/
├─ apps/
│  ├─ student/   児童用フロントエンド
│  ├─ teacher/   教師用フロントエンド
│  └─ api/       バックエンド
└─ packages/
   ├─ lib-client/  apps/student・apps/teacherで共有するEden Treatyクライアント
   └─ ui/          apps/student・apps/teacherで共有するUIコンポーネント
```

児童用と教師用のフロントエンドは別アプリとして分け、互いのコードを含めずに配信します。
`packages/`には、複数のワークスペースから利用されるものだけを置きます。

## 技術選定

前提として、`pnpm-workspace.yaml`において`catalogMode: strict`にすることで、パッケージ間で異なるライブラリのバージョンを追加してしまう問題を防ぎます。

### 共通

| 領域                   | 採用                                    |
| ---------------------- | --------------------------------------- |
| 言語                   | TypeScript                              |
| パッケージマネージャ   | pnpm                                    |
| モノレポ               | pnpm workspaces + Turborepo             |
| ツールのバージョン管理 | mise（Node / Bun）                      |
| Linter                 | oxlint + tsgolint（type-aware linting） |
| Formatter              | oxfmt                                   |
| Git Hooks              | lefthook                                |
| CI                     | GitHub Actions                          |

pnpmのバージョンは`package.json`の`packageManager`で指定します。

### apps/api

| 領域             | 採用                                      |
| ---------------- | ----------------------------------------- |
| ランタイム       | Bun                                       |
| フレームワーク   | Elysia                                    |
| 通信方式         | RPC（Eden）                               |
| スキーマ         | TypeBox（Elysia.t提供）                   |
| リアルタイム通信 | WebSocket（uWebSocketを基盤にElysia提供） |
| データベース     | PostgreSQL                                |
| ORM              | Drizzle ORM                               |
| DBドライバ       | pg                                        |
| マイグレーション | drizzle-kit                               |
| テスト           | bun test                                  |
| デプロイ         | Railway                                   |
| DBホスティング   | Neon（本番・開発で別プロジェクト）        |

マイグレーションは、MVP完成までは`push`、完成後は`generate` + `migrate`で運用します。
開発は開発用Neonプロジェクトのブランチ上で行い、本番は別プロジェクトにします。ローカルにPostgresは立てません。
開発ブランチの作成と接続文字列の取得はNeon CLI（`neon link` / `neon checkout`）で行い、アプリは`.env.local`の`DATABASE_URL`だけを読みます。
手元の`.neon`は開発用プロジェクトに固定し、本番の接続文字列はRailwayの環境変数で渡します。

### packages/lib-client

| 領域            | 採用        |
| --------------- | ----------- |
| APIクライアント | Eden Treaty |

`apps/student` / `apps/teacher`間で共有するEden Treatyクライアントを生成し、エクスポートします。
`apps/api`への依存は`App`型の`import type`に限り、それ以外の依存は持ちません。
`@elysia/eden`・`elysia`（型のみ）・`apps/api`への依存を宣言するのはこのパッケージだけです。

### packages/ui

| 領域             | 採用      |
| ---------------- | --------- |
| フレームワーク   | React     |
| UIコンポーネント | Mantine   |
| UIカタログ       | Storybook |

`apps/student` / `apps/teacher`間で共有するためのUIコンポーネントを定義します。

pnpmで管理するパッケージについて、どれをpeer dependenciesに追加していいか迷った時には、**一つのインスタンスで共有しないと壊れるのかどうか**を基準に判断してください。

### 導入しないもの

- 認証ライブラリ（識別はQRコードで行います）
