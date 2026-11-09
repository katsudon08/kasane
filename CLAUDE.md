# KASANEの開発ルール

小学校の授業で使う、QRカードでロボットを動かすプログラミング教材です。
実装の前に、該当する仕様書を必ず読んでください。

- 画面・文言: `docs/specs/single/README.md`
- 迷路・命令・実行ルール: `docs/specs/single/domain.md`
- データモデル・API・アクセス制御・性能: `docs/specs/single/backend.md`
- 構成と技術選定: `docs/architecture.md`

仕様書と食い違う実装が必要になったら、実装する前に止まって確認してください。

## 構成

- `apps/api`: Bun＋Elysia＋Drizzle。Clean Architecture（`apps/api/README.md`）
- `apps/teacher`、`apps/student`: React＋TanStack Router/Query＋Mantine＋Lucide React。児童用はReact Three Fiber＋drei。Feature-Sliced Design（各README）
- `packages/core`: 迷路・命令・コンパイル・進み具合・チュートリアルの純粋関数と型。DB・React・ブラウザAPIに依存しない。複数のパッケージで使うものだけを置く（児童の端末だけが使う迷路やカードの並びの編集は`apps/student`の`features`に置く）
- `packages/lib-client`: Eden Treatyのクライアント

## 守ること

### 設計

- 今必要でない抽象化・設定項目・汎用化をしない。同じものが2か所で必要になってから共通化する
- 共通UIコンポーネントは最小限にする
- 判断や計算は純粋関数に切り出し、テストを書く。React・Elysiaのコードは純粋関数を呼ぶだけにする。純粋関数は元の値を書き換えず、新しい値を返す。想定内の失敗は`{ ok: false, reason }`のような値で返し、呼び出し側の誤りだけ例外にする
- 新しいライブラリを追加するときは、先に理由を説明して確認を取る（`pnpm-workspace.yaml`の`catalog`に追加する）
- APIは同一オリジンのプロキシではなくCORSでつなぐ

### ごまかし防止

- テストは仕様書から書く。純粋関数は仕様の表をそのままテストケースにし、実装より先に書いてコミットする
- コミット済みのテスト（`**/*.test.ts`・`e2e/**`）と設計書（`docs/specs/**`）は、Claude Codeのフック（`.claude/hooks/deny-protected-writes.sh`）が書き込みを拒否する。コミット前のテストは書けるし直せる。テストが通らないときは、テストではなく実装を直す。テスト自体が仕様と食い違っているときは、直さずに止まって人に伝える
- `any`・空の`catch`・`TODO`などのコメント・`skip`や`only`したテストはoxlintがエラーにする。ルールを外したり無効化のコメントで避けたりしない

### ブランチとコミット

- `main`では作業しない。`develop`から`<種別>/<内容を英語にしたケバブケース>`（例: `chore/setup-gates`・`feat/core-compile`）を切り、`develop`へsquashマージする
- `docs/specs/single/plan.md`のタスクはIssueを起票しない（AI駆動で進めたタスクと、人がIssueで管理するタスクを区別するため）。PRテンプレートの「関連Issue」は空のままでよい
- タスクの中はコミットできる単位に分ける。テストのコミットと実装のコミットは分ける（コミットした時点でテストが固定される）

### セキュリティ

- 本人の特定は`resolve`（または`macro`）の一か所で行い、パスのIDを使うクエリには必ず本人のIDを`WHERE`に入れる
- 見つからない・権限がないは、どちらも`404`
- 入力は`t`（TypeBox）で型・長さ・範囲を検証する
- トークンはSHA-256にしてから保存する（DBにはハッシュだけを置く）
- `dangerouslySetInnerHTML`・`innerHTML`・`eval`を使わない。利用者の入力はテキストノードとして描き、`href`や`src`に入れない。ルビは`<ruby>`要素をReactで組み、HTML文字列にしない

### 性能

- 再レンダリングを増やさない（React Compilerがなければ`memo`/`useMemo`/`useCallback`）
- `<Canvas>`は一画面に一つ、`frameloop="demand"`、マスは`InstancedMesh`、アニメーションは`useFrame`でrefを書き換える。光る表現は材質の発光だけで、後処理（ブルームなど）は入れない
- サーバーの状態はTanStack Queryで扱い、`staleTime`を仕様書どおりに設定する

### 画面と文言

- 一画面一目的。主ボタンは一つ
- 強調は文言ではなく、形・色・動きで行う
- 文言は「何を」「どうする」を省略しない。開発者向けの言葉（ルーム、トークン、エラーなど）を画面に出さない
- 児童画面は小学6年生までに習う漢字だけを使い、漢字にはすべてルビを振る。教師画面はルビを振らない。タップできる部分は64px四方以上、文字は20px以上
- 日本語と英数字の間にスペースを入れない（コードのコメント・ドキュメントも同じ）

## 終える前に

```sh
mise run check      # lint・format・FSDの依存チェック
mise run typecheck
mise run test
mise run e2e        # Playwright。教師・児童の開発サーバーを自動で起動する
```

すべて通ってから完了を報告してください。報告には、仕様書のどの節を実装したかと、確かめられなかったこと（実機でしか分からないことなど）を書いてください。
