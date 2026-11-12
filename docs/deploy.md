# デプロイ

本番の配信先と、初めて出すときの手順を記します。

## 配信先

| 対象         | 配信先                                               | 設定                                                    |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------- |
| 教師用アプリ | Cloudflare Workersの静的アセット（`kasane-teacher`） | `apps/teacher/wrangler.jsonc`・`apps/teacher/worker.js` |
| 児童用アプリ | Cloudflare Workersの静的アセット（`kasane-student`） | `apps/student/wrangler.jsonc`・`apps/student/worker.js` |
| API          | Railway（1台）                                       | `apps/api/Dockerfile`と、Railwayの画面の設定（下の表）  |
| データベース | Neonの本番用プロジェクト                             | Railwayの環境変数`DATABASE_URL`                         |

- **`main`にマージすると出る**
  - 教師用・児童用アプリは、GitHub Actions（`.github/workflows/deploy.yml`）がビルドしてCloudflareへ出す
  - APIは、Railwayが`main`を見て`apps/api/Dockerfile`でビルドして出す
- **APIは、出す前に本番のDBへマイグレーションを当てる**
  - Railwayのpre-deploy stepで`migrate-database.ts`を動かす
- **教師用・児童用アプリは、アセットに無いURLだけを`worker.js`が受け持つ**
  - 画面のURLには`index.html`を返し、`/assets/`の下は404を返す
- **教師用・児童用アプリの応答ヘッダーは、ビルド時に`dist/_headers`へ書き出す**
  - 中身は各アプリの`vite.config.ts`にある（[backend.md「そのほかのセキュリティ設定」](specs/single/backend.md#そのほかのセキュリティ設定)）
  - CSPの`connect-src`は`VITE_API_ORIGIN`から作る

## Railwayの設定

APIのビルドと起動の設定は、Railwayの`@kasane/api`のSettingsに置きます（RailwayのConfig as Codeは新しいサービスで使えず、2026-12-01に廃止されるため、`railway.json`は置きません）。

| 項目                    | 値                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Source → Root Directory | 空（リポジトリのルート。Dockerfileが`packages/core`とlockfileを読むため）                       |
| Source → Branch         | `main`                                                                                          |
| Build → Builder         | Dockerfile（パスは`apps/api/Dockerfile`）                                                       |
| Build → Watch Paths     | `/apps/api/**`・`/packages/core/**`・`/package.json`・`/pnpm-lock.yaml`・`/pnpm-workspace.yaml` |
| Deploy → Start Command  | 空（Dockerfileの`CMD`で起動する）                                                               |
| Deploy → Pre-deploy     | `bun run src/infrastructure/database/migrate-database.ts`                                       |
| Deploy → Healthcheck    | `/health`                                                                                       |
| Scale                   | `Southeast Asia (Singapore)`に1台（SSEの送り先をプロセスのメモリに持つため、2台にしない）       |
| Edge → CDN Caching      | オフ                                                                                            |

## 環境変数

オリジンは`https://`から始め、末尾に`/`を付けません。

### Railway（API）

| 名前             | 値                                                                            |
| ---------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`   | Neonの本番用プロジェクトの接続文字列                                          |
| `TEACHER_ORIGIN` | 教師用アプリのオリジン（`https://kasane-teacher.{サブドメイン}.workers.dev`） |
| `STUDENT_ORIGIN` | 児童用アプリのオリジン（`https://kasane-student.{サブドメイン}.workers.dev`） |
| `PORT`           | `8080`（ドメインの向き先のポートとそろえる）                                  |

### GitHub（Actions）

どれもEnvironment`production`に入れます。

| 種類     | 名前                    | 値                                                                          |
| -------- | ----------------------- | --------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`  | 対象のアカウントの「Workers Scripts:Edit」だけを許したAPIトークン           |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | CloudflareのアカウントID                                                    |
| Variable | `API_ORIGIN`            | APIのオリジン（Railwayで作ったドメイン）。ビルドの`VITE_API_ORIGIN`になる   |
| Variable | `STUDENT_ORIGIN`        | 児童用アプリのオリジン。ビルドの`VITE_STUDENT_ORIGIN`（授業QRの中身）になる |

## 初めて出す手順

1. **Neonで本番用プロジェクトを作る**
   - 接続文字列を控える（開発用プロジェクトとは別にする）
2. **Cloudflareで出す先を用意する**
   - Workersの`workers.dev`のサブドメインを決める
     - 教師用・児童用アプリのオリジンは`https://kasane-teacher.{サブドメイン}.workers.dev`と`https://kasane-student.{サブドメイン}.workers.dev`になる
   - カスタムトークンで、対象のアカウントの「Workers Scripts:Edit」だけを許したAPIトークンを作る
3. **RailwayでAPIのサービスを作る**
   - GitHubのこのリポジトリからサービスを作る
     - Railwayが`apps/`の下を見てサービスを3つ作るので、`@kasane/teacher`と`@kasane/student`は消す
   - `@kasane/api`のSettingsを、上の「Railwayの設定」の表のとおりにする
     - Railwayが自動で入れたStart Command（`pnpm --filter @kasane/api dev`）は消す
   - Networkingでドメインを作ってAPIのオリジンを控える（ポートを聞かれたら`8080`）
   - Variablesに上の表の4つを入れる
4. **GitHubのEnvironmentを作り、SecretとVariableを入れる**
   - リポジトリのSettings → EnvironmentsでEnvironment`production`を作る
     - Deployment branchesを`main`だけにする
   - そのEnvironmentに、上の表の4つを入れる
5. **`main`にマージする**
   - 出し直すだけのときは、ActionsのDeployを手で動かす（workflow_dispatch）

## 出した後に確かめること

- **`{APIのオリジン}/health`が`OK`を返す**
- **教師用アプリで授業を始めると、授業QRの画面に移る**
  - 教師用アプリからAPIへHTTP（CORS）で届いている
- **児童用アプリで授業QRを読み取って参加すると、教師の進み具合にその児童が出る**
  - 教師用アプリがAPIのSSEを受け取れている
- **教師の進み具合を30分ほど開いたままにしても、「つながっていません」の帯が出たままにならない**
  - Railwayが長い接続を切っても、つなぎ直せている
- **児童のプレイ画面で命令カードを読み取れ、ロボットが動く**
  - CSPでQRの読み取りとロボットのモデルの展開（WebAssembly）が止められていない
- **教師用・児童用アプリのどちらでも、ブラウザーのコンソールにCSPの違反が出ていない**
