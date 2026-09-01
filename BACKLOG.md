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

Zernio(https://zernio.com)経由の実装から、「顧客からGraph APIトークンを取得しない・
OAuthで自己連携できる」自前の仕組みに切り替え済み（Zernioと同じ土俵に立つのが目的）。

- [x] `npm run new-connector instagram` から開始
- [x] `instagram.post.create`（フィード投稿、destructive: true）を Meta Graph API 直接呼び出しで実装
- [x] Instagram Business Login による OAuth 連携フロー（`GET /oauth/instagram/start?customer=<name>` → ログイン → `callback` でトークン取得）
- [x] `core/auth-vault/token-store.ts`: OAuthで取得したアクセストークンをAES-256-GCMで暗号化しローカルファイル(`data/oauth-tokens.enc.json`)に保存
- [x] fixtureテスト（未連携時のAUTH_EXPIRED / dry_run / 正常系(コンテナ作成→ステータス確認→publish) / エラー系 / 未知ツール）
- [x] 手動確認: OAuth startのリダイレクトURL生成、不正state拒否、トークン未連携時のエラーメッセージ、連携済み想定でのdry_runプレビュー
- [ ] **Facebook Developerでアプリを作成し、App ID/Secretを取得する（ユーザー側の作業、下記手順参照）**
- [ ] 実際にOAuthでInstagramアカウントを連携し、本番投稿まで確認（`npm run smoke -- instagram`）
- [ ] customers/<実際の顧客名>/config.yaml を用意して MCP E2E 確認
- [ ] 拡張予定（ユーザーからの要望あり）: ストーリー/リール投稿、DM自動応答（webhook受信）
- [ ] トークンの自動リフレッシュ（60日長期トークンの期限が近づいたら `GET https://graph.instagram.com/refresh_access_token` で更新）は未実装。今は期限切れ後に再度OAuth連携が必要
- [ ] Graph APIの実際のエラーレスポンス(コード190=トークン失効等)を踏まえて `core/resilience/error-taxonomy.ts` 経由のhintを調整する

### Facebook Developerアプリのセットアップ手順（ユーザー作業）

1. https://developers.facebook.com/apps でアプリを作成（種類: 「Business」）
2. 製品として「Instagram」→「API setup with Instagram login」を追加
3. 「有効なOAuthリダイレクトURI」に `{MUSUBI_PUBLIC_BASE_URL}/oauth/instagram/callback` を登録
4. 開発モード中はテスターとして自分のInstagramビジネス/クリエイターアカウントを追加すれば連携テスト可能（一般顧客に公開するにはApp Reviewでinstagram_business_content_publish等の審査が必要）
5. アプリダッシュボードの「設定」→「基本」からApp IDとApp Secretを取得し、`.env` の `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` に設定

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
- `core/auth-vault/token-store.ts` はVPS単一インスタンス・低頻度書き込み前提の簡易実装（暗号化JSONファイル1本、ファイル全体読み直し→マージ→書き込み）。複数インスタンス化するなら実DBかRedis等への移行が必要。
- OAuthの `state` パラメータはHMAC署名+10分TTLで検証しているが、ワンタイム性（リプレイ防止）までは持たせていない。実運用で気になるなら使用済みstateの記録を追加する。
- `core/oauth-store`的な汎用フレームワークにはせず、Instagram専用で実装した（ユーザー判断）。将来他プラットフォームでもOAuthが必要になったら、`interfaces/oauth/instagram-connect.ts` と `core/auth-vault/token-store.ts` の共通部分を抜き出して汎用化する。
