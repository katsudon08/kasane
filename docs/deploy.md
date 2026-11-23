# デプロイ

本番の配信先と、初めて出すときの手順を記します。デスクトップアプリの配り方は[デスクトップアプリの配布](#デスクトップアプリの配布)に記します。

## 配信先

| 対象               | 配信先                                               | 設定                                                                 |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------- |
| 教師用アプリ       | Cloudflare Workersの静的アセット（`kasane-teacher`） | `apps/teacher/wrangler.jsonc`・`apps/teacher/worker.js`              |
| 児童用アプリ       | Cloudflare Workersの静的アセット（`kasane-student`） | `apps/student/wrangler.jsonc`・`apps/student/worker.js`              |
| API                | Railway（1台）                                       | `apps/api/Dockerfile`と、Railwayの画面の設定（下の表）               |
| データベース       | Neonの本番用プロジェクト                             | Railwayの環境変数`DATABASE_URL`                                      |
| デスクトップアプリ | GitHubのReleases                                     | `apps/desktop/electron-builder.yml`・`.github/workflows/release.yml` |

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

## デスクトップアプリの配布

自由モードのデスクトップアプリ（`apps/desktop`）のインストーラーを、GitHubのReleasesに置きます（[free-mode.mdの「配布」](specs/single/free-mode.md#配布)）。

| OS                          | ファイル           | 形                                                      |
| --------------------------- | ------------------ | ------------------------------------------------------- |
| Windows（x64）              | `KASANE-Setup.exe` | 押すだけで入るインストーラー（管理者の権限は要らない）  |
| Mac（Apple Silicon・Intel） | `KASANE.dmg`       | どちらの種類のMacでも動くアプリを入れたディスクイメージ |

- **`main`に`v`で始まるタグを押すと出る**
  - GitHub Actions（`.github/workflows/release.yml`）が、WindowsとMacのランナーでインストーラーを作り、Releasesに置く
  - `main`にないコミットのタグでは置かない
  - 版はタグ（`v1.0.0`なら`1.0.0`）から付ける。ファイル名には版を入れない
  - 入口のダウンロードのボタンは、いちばん新しいReleaseのこの名前のファイルを指す
- **デスクトップアプリを変えたPRでは、インストーラーを作るところまでを確かめる**
  - Releasesには置かない。作ったインストーラーは、そのPRのActionsの実行結果（Artifacts）から7日間落とせる
- **署名はしない**
  - 開くときにWindowsとMacが警告を出す（下の「入れ方」）
  - Macは、Apple Siliconで動かすために、証明書の要らない仮の署名（ad-hoc）だけを付ける
- **インストーラーに入れる児童用アプリは、APIのオリジンに仮の値（`http://localhost:3000`）を入れてビルドする**
  - デスクトップアプリは`/free`の外へ移らず、APIを呼ばない
  - 本番の値を持つEnvironment`production`は、`main`からしか使えない

### 出す手順

1. **`develop`を`main`にマージする**
2. **`main`の先頭に版のタグを付けて押す**

   ```sh
   git switch main
   git pull
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **ActionsのReleaseが終わったら、Releasesに`KASANE-Setup.exe`と`KASANE.dmg`が置かれていることを確かめる**

### 入れ方（警告が出たときの開き方）

文言は、OSの版によって少し違うことがあります。

#### Windows

1. 入口の「パソコン用のKASANEをダウンロードする」から`KASANE-Setup.exe`を落として開く
   - ブラウザーが落とすのを止めたら、ダウンロードの一覧から、残す（保存する）ほうを選ぶ
2. 「WindowsによってPCが保護されました」と出たら、「詳細情報」を押し、「実行」を押す
3. 入るとKASANEが開く
   - 次からは、デスクトップかスタートメニューの「KASANE」から開く

#### Mac

1. 入口の「パソコン用のKASANEをダウンロードする」から`KASANE.dmg`を落として開く
2. 出てきた窓で、「KASANE」を「Applications」へドラッグする
3. アプリケーションのフォルダーの「KASANE」を開く
4. 「“KASANE”は開かれていません」と出たら、「完了」を押す
5. システム設定の「プライバシーとセキュリティ」を開き、下のほうの「“KASANE”はMacを保護するためにブロックされました」の横の「このまま開く」を押す
6. もう一度出る確認で「このまま開く」を押し、パスワード（またはTouch ID）を入れる
7. カメラの使用の許可を聞かれたら、「許可」を押す
   - 次からは、アプリケーションのフォルダーかLaunchpadの「KASANE」から開く

### 出した後に確かめること

- **入口のダウンロードのボタンから、WindowsではKASANE-Setup.exe、MacではKASANE.dmgが落ちる**
- **入れたKASANEを開くと、自由モードのホームが開く**
- **カメラで命令カードを読み取って、問題をクリアできる**
- **ネットを切っても開けて、遊べる**
