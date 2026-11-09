# アーキテクチャ

本サービスの構成と、採用する技術を記します。
各アプリの内部構成（ディレクトリ構成とレイヤーの役割）は、`apps/api/README.md`・`apps/student/README.md`・`apps/teacher/README.md`に書きます。

## システム構成

```
 教師 ブラウザ          児童A タブレット      児童B タブレット …
 (apps/teacher)         (apps/student)        (apps/student)
      │ HTTP / SSE            │ HTTP / SSE          │ HTTP / SSE
      └───────────────────────┴─────────────────────┘
                              │
                     サーバー（apps/api、1プロセス）
                              │
                          データベース
```

- クライアントは教師のブラウザ1台と児童のタブレットN台で、どれも相手はサーバーだけ。クライアント同士はつながらない
- 状態を変える操作はすべてHTTPで行い、サーバーからの知らせだけをSSEで受け取る（[backend.md](specs/single/backend.md#全体の流れ)）
- 児童と教師は、ログインではなくQRコードと端末に保存したトークンで識別する
- ペアモードで双方向の通信が必要になったら、そのときにWebSocketを検討する

## 各領域の責務

### 児童用フロントエンド（apps/student）

- 命令カードのQRを読み取り、カードの並びを木構造のプログラムに組み立てる
- プログラムをサーバーへ送り、返ってきたコンパイルの結果で迷路とロボットを3Dで描く
- 迷路を作るエディタを持つ

### 教師用フロントエンド（apps/teacher）

- 授業を作り、授業QRを表示し、授業を終える
- サーバーから受け取った児童ごとの進み具合を描く

### サーバー（apps/api）

- 教師と児童をトークンで特定し、本人のデータにだけ触れさせる
- 受け取ったプログラムをコンパイルし、結果を応答で返す
- 児童の進み具合をDBから求め、教師にSSEで知らせる
- SSEの送り先をプロセスのメモリ上に持つ（そのためサーバーは1台で動かす）

### データベース

- 教師・授業・児童・迷路・送った記録を正本として保持する
- 進み具合は保存せず、送った記録から求める

## リポジトリ構成

パッケージ名のスコープは`@kasane`とします。

```
kasane/
├─ apps/
│  ├─ student/     児童用フロントエンド
│  ├─ teacher/     教師用フロントエンド
│  └─ api/         バックエンド
└─ packages/
   ├─ core/        迷路・命令・コンパイル・進み具合の純粋関数と型
   ├─ lib-client/  Eden Treatyのクライアント
   └─ ui/          共有UIコンポーネント
```

児童用と教師用のフロントエンドは別アプリとして分け、互いのコードを含めずに配信します。
`packages/`には、複数のワークスペースから利用されるものだけを置きます。

### パッケージ間の依存の向き

```
core ←── api ←── lib-client ←── student / teacher
core ←──────────────────────── student / teacher
ui   ←──────────────────────── student / teacher
```

- `core`はほかのワークスペースに依存しない。DB・React・ブラウザAPIにも依存しない
- `api`は`core`のコンパイルと迷路の確認を使う
- `lib-client`は`api`の`App`型を`import type`するだけで、`api`の実行時コードは含まない
- `student`と`teacher`は`core`・`lib-client`・`ui`に依存し、`api`には直接依存しない
- 循環する依存は作らない（Turborepoがエラーで止まる）

### packages/coreに置くもの

- 迷路・命令カード・プログラム・コンパイルの結果の型
- コンパイル（`compile`）、迷路とプログラムの確認（`validateMaze`・`validateProgram`）、進み具合の判定
- チュートリアルの定数

どこで使うかは[domain.md](specs/single/domain.md)の冒頭に書きます。

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

| 領域                 | 採用                               |
| -------------------- | ---------------------------------- |
| ランタイム           | Bun                                |
| フレームワーク       | Elysia                             |
| 通信方式             | HTTP（RPC: Eden）                  |
| サーバーからの知らせ | SSE（Elysia標準の`sse`）           |
| スキーマ             | TypeBox（Elysia.t提供）            |
| データベース         | PostgreSQL                         |
| ORM                  | Drizzle ORM                        |
| DBドライバ           | pg                                 |
| マイグレーション     | drizzle-kit                        |
| テスト               | bun test                           |
| デプロイ             | Railway（1台）                     |
| DBホスティング       | Neon（本番・開発で別プロジェクト） |

マイグレーションは、MVP完成までは`push`、完成後は`generate` + `migrate`で運用します。
Neonのプロジェクトは本番と開発の二つに分けます。ローカルにPostgresは立てません。
開発用プロジェクトには`main`・`develop`・`test`の三つのブランチを置き、`main`では作業しません。開発（`.env.local`）は`main`から分岐した`develop`、テスト（`.env.test.local`）は`test`の接続文字列を`DATABASE_URL`に入れます。
ブランチの作成と接続文字列の取得はNeon CLI（`neon link` / `neon checkout`）で行い、アプリは`DATABASE_URL`だけを読みます。
手元の`.neon`は開発用プロジェクトの`develop`ブランチに固定し、本番の接続文字列はRailwayの環境変数で渡します。

### apps/student・apps/teacher

| 領域             | 採用                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| フレームワーク   | React                                                                                                                                                          |
| ビルド           | Vite                                                                                                                                                           |
| ルーティング     | TanStack Router                                                                                                                                                |
| サーバーの状態   | TanStack Query                                                                                                                                                 |
| UIコンポーネント | Mantine                                                                                                                                                        |
| アイコン         | Lucide React（SVG。足りない形は自前のSVG）                                                                                                                     |
| 3D               | React Three Fiber＋@react-three/drei（児童用のみ。dreiはカメラ操作・カメラを向く文字と図形に使う。後処理のブルームなどは入れない）                             |
| フォント         | 児童用はKlee One、教師用はBIZ UDPGothic（どちらもSIL OFL。学校のネットワークは外部に出られない前提で、フォントファイルをリポジトリに置いてビルドに含めて配る） |
| QRの読み取り     | @yudiel/react-qr-scanner（児童用のみ）                                                                                                                         |
| QRの表示         | qrcode.react（教師用のみ）                                                                                                                                     |
| 設計             | Feature-Sliced Design（steigerで検査）                                                                                                                         |
| テスト           | Vitest（単体）、Playwright（E2E。偽のカメラ映像でQRを読ませる）                                                                                                |
| デプロイ         | Cloudflare                                                                                                                                                     |

APIとは同一オリジンのプロキシではなくCORSでつなぎます。

### packages/core

| 領域   | 採用     |
| ------ | -------- |
| テスト | bun test |

依存を持たない純粋関数と型だけを置きます。

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

`apps/student` / `apps/teacher`間で共有するためのUIコンポーネントを定義します。2画面以上で同じものが必要になったときだけ作ります。

pnpmで管理するパッケージについて、どれをpeer dependenciesに追加していいか迷った時には、**一つのインスタンスで共有しないと壊れるのかどうか**を基準に判断してください。

### 導入しないもの

- 認証ライブラリ（識別はQRコードとトークンで行います）
- WebSocket（シングルモードではSSEで足ります）
