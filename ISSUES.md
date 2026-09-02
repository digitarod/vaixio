# ISSUES

founder向けの蓄積型記録。GitHub Issuesは実務的なバグ管理、こちらは低頻度・重要な意思決定/リスクの記録用。
週次でPM役がここに追記する（緊急時はその日のうちに先頭に追記）。詳細な設計判断は `architechure/`・`BACKLOG.md`・各PRの説明を参照。

## 2026-09-02: Postgres + 顧客セルフサービスダッシュボード基盤 着手時のフラグ

- [ ] **「登録」の対象範囲**: v1は「既にconfig.yamlをコミット済みの既存顧客」限定。Web経由の完全新規顧客の自己プロビジョニング（MCP利用まで含む）は今回のスコープ外。将来必要になったら別途設計。
- [ ] **メール送信基盤が無い**: メール確認・パスワードリセットはv1未実装（`dashboard_users.email_verified_at`列だけ先に用意）。実運用前にResend/Postmark等の選定が必要。
- [ ] **ログイン試行のレート制限が最低限**: Redis等の専用基盤は無い。ブルートフォース対策の強化は今後の課題。
- [ ] **バックアップ運用が未整備**: `data/oauth-tokens.enc.json`（暗号化トークン）にも、新規のPostgres（顧客ログイン情報を含む）にも、VPS外へのバックアップが無い。最低限`pg_dump`の定期取得を推奨。
- [ ] **VPSリソースサイジング未検証**: Postgres＋Node（tsx直接実行）＋SPA配信を1台で稼働させる構成。ダッシュボードの実利用が始まったらVPSプランを見直す必要があるかもしれない。
- [ ] **argon2ではなくNode標準crypto.scryptを採用**: 本番の`node:20-slim`イメージにビルドツールが無くargon2のネイティブビルドが失敗するため。scryptはOWASP許容範囲内だが、将来ネイティブビルド環境を用意できるなら再検討の余地あり。

## 運用ルール

- PMは差分が `core/`・`core/db/migrations`・`dashboard_users`・`dashboard_sessions`・`auth`・`password`・`.env`・`docker-compose` のいずれかに触れているPRを絶対に自動マージしない。`needs-founder-review`ラベルを付けてコメントのみ行う。
- 上記に触れないPRはCI green確認の上、PMが承認・マージしてよい。
