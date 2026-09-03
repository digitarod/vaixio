# Musubi 仕様書（specs/）

このディレクトリは**仕様駆動開発**のための機能仕様書を置く場所。`architechure/`が
プロダクト全体の設計思想、`docs/`が自動生成のツールカタログであるのに対し、
`specs/`は**個々の機能・サブシステムが「何を」「なぜ」「どう」実現するかを人が書く**場所。

## 運用ルール

1. **新機能は実装前にspecを書く**（またはPRの説明にspecへの差分を含める）。小さな
   バグ修正やリファクタリングにはspecは不要。「新しいツール」「新しいAPI」「新しい
   画面/フロー」「新しいDBテーブル」を追加する時が対象。
2. specは**実装後も陳腐化させず更新する**。実装とspecが乖離したら、気づいた人が
   直す（コードレビューの一部として扱う）。
3. ファイル名は `specs/<subsystem>.md`。1ファイル1サブシステム（例:
   `specs/instagram-connector.md`, `specs/dashboard-api.md`）。
4. 各specの基本構成:
   - **目的**: なぜこれが必要か、誰のためか
   - **仕様**: 具体的な入出力・状態遷移・エラーケース（実装の詳細ではなく「外部から見た振る舞い」を書く）
   - **既知の制約・スコープ外**: 意図的にやっていないこと
   - **関連ファイル**: 実装の入り口となるファイルパス（specはコードの代わりにはならない。コードの真実は常にコード自身）

## 現在のspec一覧

- [instagram-connector.md](./instagram-connector.md) — Instagram投稿コネクタ + OAuth連携
- [database.md](./database.md) — Postgresスキーマとデータの真実の源の方針
- [dashboard-api.md](./dashboard-api.md) — 顧客セルフサービスダッシュボードのバックエンドAPI
- [web-dashboard.md](./web-dashboard.md) — ダッシュボードSPA(web/)
