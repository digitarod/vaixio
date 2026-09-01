# BACKLOG

`/loop` はこの上から着手する（§9 開発ループ）。完了したら取り消し線を引いて日付を添える。

## P1: 骨格（完了）

- [x] リポジトリ初期化・TypeScript/Node セットアップ
- [x] core/domain・core/ports・core/registry・core/router・core/telemetry・core/resilience・core/auth-vault
- [x] MCPサーバー最小構成（interfaces/mcp, StreamableHTTP）＋ REST副入口（interfaces/rest）
- [x] customers/admin スコープ ＋ musubi.health 他4本の自己診断ツール
- [x] eslint-plugin-boundaries による依存方向強制 ＋ check:core-freeze ＋ new-connector スキャフォールド
- [x] 受け入れ基準確認: `/mcp/admin` に接続し `musubi.health` が返る（手動確認済み）

## P2: Instagramコネクタ（着手中、顧客要望により最優先）

- [x] `npm run new-connector instagram` から開始
- [x] `instagram.post.create`（フィード投稿、destructive: true）を Zernio (https://zernio.com) 経由で実装
- [x] fixtureテスト（dry_run / 正常系 / エラー系 / 未知ツール）
- [ ] 実際の Zernio API キー・account_id で smoke 確認（`npm run smoke -- instagram`、`VAULT__INSTAGRAM__API_KEY` 要設定）
- [ ] customers/<実際の顧客名>/config.yaml を用意して MCP E2E 確認
- [ ] 拡張予定（ユーザーからの要望あり）: ストーリー/リール投稿、DM自動応答（webhook受信）
- [ ] Zernioのレート制限(24h/100投稿)・重複コンテンツ・メディア取得失敗のエラーメッセージを実際に踏んで taxonomy の hint を調整する

## P2.5: LINEコネクタ

- [ ] `npm run new-connector line` から開始
- [ ] 既存 hermes-agent の LINE 連携実装を移植（チャネルトークン、Webhook署名検証は §1.3 チャットボットP3寄りなので今回は message.send/profile.get 中心）
- [ ] `line.message.send`（destructive: true）/ `line.profile.get`
- [ ] 4層テスト（contract / fixture / smoke / MCP E2E）グリーン
- [ ] customers/sample-salon のような実顧客configの雛形を1つ用意

## P3: 調査基盤の強化

- [ ] flight-recorder を永続化（現状プロセス内メモリのみ、再起動で消える）
- [ ] musubi.connector.smoke を healthCheck 代替ではなく実際のsmokeテストランナーに接続
- [ ] エラー分類 taxonomy を実障害ベースで拡充

## P4: ループ確立

- [ ] GitHub Actions: lint / check:boundaries / check:core-freeze / test を1本化
- [ ] デプロイ（イメージpull方式）を VPS に接続
- [ ] Cowork in Chrome での MCP E2E シナリオを test-reports/ に保存する手順を固める

## P5/P6: 顧客スコープ・商品化

- [ ] Traefik 側に `/mcp/<customer>` のルーティングを追加（既存Traefikは触らない）
- [ ] 初回顧客（Hermes Agent）デモに向けたツールカタログ・監査ログ見本の整備

## 既知の設計メモ（後で見返す）

- `core/resilience/circuit-breaker.ts` の閾値(5回)・クールダウン(30秒)はP1の仮値。実運用データで調整する。
- `core/router/index.ts` の boundaries ルールは connector 間 import を type レベルで一律禁止しているため、1コネクタ内でファイルを分割して相互 import する構成は現状書けない（LINEコネクタが単一 adapter.ts で収まる想定なら問題なし。将来必要なら `capture` を使った同一コネクタ内許可ルールに拡張する）。
- `core/registry/index.ts` の `loadAdapter()` は connector の動的 import に絶対パス文字列をそのまま渡している（`pathToFileURL()` にすると、リポジトリパスに非ASCII文字を含む環境で vitest(Vite) の解決が失敗するため）。
- instagram コネクタは Zernio の API キーを顧客ごとではなく `vault://instagram/api_key` 1本にまとめている（Zernio 1アカウントで複数クライアントのプロフィールを束ねる運用を想定）。もし顧客ごとに別々の Zernio アカウント/キーを使う運用に変わったら、`customers/<name>/config.yaml` の `credentials.instagram` 経由で読み替える設計に直すこと。
- Zernio の `POST /v1/posts` の正確なレスポンススキーマ（成功時・エラー時とも）は公開ドキュメントから完全には確認できなかった。`connectors/instagram/adapter.ts` の `ZernioPostResponse` は id/status のみを緩く検証しており、実際のレスポンスを見たら zod スキーマを厳密化すること。
