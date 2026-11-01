# バックエンド

## アーキテクチャ

**Clean Architecture**

```text
src/
├── domain/          ドメインモデルと業務ルール
├── application/     ユースケースとポート
├── presentation/    HTTP・WebSocket の入出力
├── infrastructure/  DB や外部 API などの実装
└── index.ts         サーバー起動
```

各層の役割は[The Clean Code Blog](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)に基づく。

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
