# CONTRIBUTING

## 環境構築

[README の Setup](README.md#setup) を参照してください。

## Git の運用

- 作業は Issue を起点にします。未決の事柄は **「決めること」** 、作業は **「やること」** のテンプレートで Issue を作ります。
- ブランチ名は `<type>/<Issue番号>-<内容>` とします。Issue が無い場合は `<type>/<内容>` です。
- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/ja/) に従い、subject は日本語で書きます。
- `main` へ直接 push せず、PR を経由します。PR の本文は [pull_request_template.md](.github/pull_request_template.md) に従います。
- **「決めること」** の Issue を閉じるときは、その決定を docs に反映する変更を同じ PR に含めます。docs には決定だけを書き、経緯は Issue に残します。

## チェックが走るタイミング

| タイミング      | 走るもの                              | 定義場所                               |
| --------------- | ------------------------------------- | -------------------------------------- |
| コミット前      | フォーマット（oxfmt）、Lint（oxlint） | `lefthook.yml`                         |
| プッシュ前      | 型チェック、ユニットテスト            | `lefthook.yml`                         |
| PR の作成・更新 | 上記すべてとビルド                    | `.github/workflows/`（GitHub Actions） |

実行されるコマンドは `package.json` の `scripts` が正です。

## テストの置き場

- テストは実装ファイルの隣に `*.test.ts` として置きます。`__tests__` ディレクトリは作りません。
- 書く対象は振る舞いを持つものだけです。入力に対して出力が決まる関数と、状態が遷移するものに書き**型・定数・データ**には書きません。
- テストの文言は日本語で書きます。
