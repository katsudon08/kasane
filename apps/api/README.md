# バックエンド

## アーキテクチャ

**Clean Architecture**

```text
src/
├── domain/
│   ├── entities/        ビジネスオブジェクト
│   ├── services/        ビジネスルール
│   └── repositories/    リポジトリのインターフェース（infrastructure が実装する契約）
├── application/
│   └── usecases/        ドメインを組み合わせたユースケース
├── presentation/
│   └── controllers/     エンドポイントの定義と、リクエスト・レスポンスの変換
├── infrastructure/
│   ├── database/        DB 接続とテーブル定義
│   └── repositories/    domain/repositories のインターフェースの実装
├── config/              環境変数の読み込みなどの設定ファイル
└── index.ts             依存の組み立てとサーバー起動
```

実装の際には[クリーンアーキテクチャ入門の記事](https://zenn.dev/collabostyle/articles/1089b482fd59fe)を参考にする。

メリット

- 業務ルールを特定の技術スタックやフレームワークから切り離して外部技術の変更による影響を抑えられる。
- ユースケースを Web サーバーや DB を起動せずにユニットテストできる。
- ポートを介して外部機能の実装を差し替えられる。

デメリット

- 層の役割と依存方向を理解するまでに学習コストがかかる。
- ポートや層をまたぐデータ変換が増え、小規模な機能では実装量が増える。

## 技術スタック

- TypeScript
- Bun
- Elysia
- Drizzle ORM
- neon
