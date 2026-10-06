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
児童と教師は、手入力ではなく **QR コード**を読み取って識別します。

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

パッケージ名のスコープは `@kasane` とします。

```
kasane/
├─ apps/
│  ├─ student/   児童用フロントエンド
│  ├─ teacher/   教師用フロントエンド
│  └─ api/       バックエンド
└─ packages/
   ├─ core/      apps 間で共有する型・スキーマ
   └─ ui/        apps/student・apps/teacher で共有する UI コンポーネント
```

児童用と教師用のフロントエンドは別アプリとして分け、互いのコードを含めずに配信します。
`packages/` には、複数のワークスペースから利用されるものだけを置きます。

## 技術選定

### 共通

| 領域 | 採用 |
| --- | --- |
| 言語 | TypeScript |
| パッケージマネージャ | pnpm |
| モノレポ | pnpm workspaces + Turborepo |
| ツールのバージョン管理 | mise（Node / Bun） |
| スキーマ・検証 | zod |
| 環境変数の検証 | t3-env |
| Linter | oxlint |
| Formatter | oxfmt |
| Git Hooks | lefthook |
| CI | GitHub Actions |

pnpm のバージョンは `package.json` の `packageManager` で指定します。

### apps/student・apps/teacher 共通

| 領域 | 採用 |
| --- | --- |
| 開発ツールのランタイム | Node |
| フレームワーク | React |
| ルーティング | TanStack Router |
| ビルドツール | Vite |
| UI コンポーネント | Mantine |
| スタイリング | インラインスタイル（基本） / vanilla-extract |
| コンポーネントカタログ | Storybook |
| テスト | Vitest |
| デプロイ | Cloudflare Workers |

### apps/student

| 領域 | 採用 |
| --- | --- |
| 3D 描画 | React Three Fiber |
| QR 読み取り | @yudiel/react-qr-scanner |

### apps/api

| 領域 | 採用 |
| --- | --- |
| ランタイム | Bun |
| フレームワーク | Elysia |
| リアルタイム通信 | WebSocket（Bun 標準） |
| データベース | PostgreSQL |
| ORM | Drizzle ORM |
| DB ドライバ | pg |
| マイグレーション | drizzle-kit |
| テスト | bun test |
| デプロイ | Railway |
| DB ホスティング | Neon（本番） / Docker Compose（ローカル） |

マイグレーションは、MVP 完成までは `push`、完成後は `generate` + `migrate` で運用します。

### packages/core

| 領域 | 採用 |
| --- | --- |

`apps` 間でやり取りするメッセージの型・スキーマを定義します。

### packages/ui

| 領域 | 採用 |
| --- | --- |

`apps/student` / `apps/teacher` 間で共有するためのUIコンポーネントを定義します。

### 導入しないもの

- 認証ライブラリ（識別は QR コードで行います）
- 状態管理ライブラリ（必要になった時点で導入します）
