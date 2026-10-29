# 教師用フロントエンド

## アーキテクチャ

**Feature-Sliced Design：FSD**

```text
src/
├── app/       ルーティングや Provider などのアプリ全体の設定
├── pages/     画面とその画面固有の処理
├── widgets/   独立した大きな UI ブロック
├── features/  ユーザーが行う操作・機能
├── entities/  ドメインを表すデータや UI
└── shared/    共通 UI や API 接続などの基盤
```

各レイヤーの役割は[公式ドキュメント](https://feature-sliced.design/docs/reference/layers)に基づく。

同じレイヤーの別スライスを参照する場合は `@x` を経由する。

### メリット

- 業務ドメインやユーザーの操作を軸にコードを整理できる。
- 共通化が必要なコードを下位レイヤーに切り出し、再利用しやすくできる。
- 依存を上位レイヤーから下位レイヤーへの一方向に限定し、変更の影響を抑えられる。

### デメリット

- レイヤーとスライスの分け方を理解するまでに学習コストがかかる。
- Public API、依存方向、`@x` によるクロスインポートなど、守るべきルールの運用負担がある。

## 技術スタック

- TypeScript
- React
- TanStack Router
- Vite
- Mantine
