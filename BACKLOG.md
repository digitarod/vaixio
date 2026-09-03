# BACKLOG

`/loop` はこの上から着手する（§9 開発ループ）。完了したら取り消し線を引いて日付を添える。

## P1: 骨格（完了）

- [x] リポジトリ初期化・TypeScript/Node セットアップ
- [x] core/domain・core/ports・core/registry・core/router・core/telemetry・core/resilience・core/auth-vault
- [x] MCPサーバー最小構成（interfaces/mcp, StreamableHTTP）＋ REST副入口（interfaces/rest）
- [x] customers/admin スコープ ＋ vaixio.health 他4本の自己診断ツール
- [x] eslint-plugin-boundaries による依存方向強制 ＋ check:core-freeze ＋ new-connector スキャフォールド
- [x] 受け入れ基準確認: `/mcp/admin` に接続し `vaixio.health` が返る（手動確認済み）

## P2: Instagramコネクタ（着手中、顧客要望により最優先）

Zernio(https://zernio.com)経由の実装から、「顧客からGraph APIトークンを取得しない・
OAuthで自己連携できる」自前の仕組みに切り替え済み（Zernioと同じ土俵に立つのが目的）。

- [x] `npm run new-connector instagram` から開始
- [x] `instagram.post.create`（フィード投稿、destructive: true）を Meta Graph API 直接呼び出しで実装
- [x] Instagram Business Login による OAuth 連携フロー（`GET /oauth/instagram/start?customer=<name>` → ログイン → `callback` でトークン取得）
- [x] `core/auth-vault/token-store.ts`: OAuthで取得したアクセストークンをAES-256-GCMで暗号化しローカルファイル(`data/oauth-tokens.enc.json`)に保存
- [x] fixtureテスト（未連携時のAUTH_EXPIRED / dry_run / 正常系(コンテナ作成→ステータス確認→publish) / エラー系 / 未知ツール）
- [x] 手動確認: OAuth startのリダイレクトURL生成、不正state拒否、トークン未連携時のエラーメッセージ、連携済み想定でのdry_runプレビュー
- [x] Facebook Developerでアプリを作成し、App ID/Secretを取得（ユーザー側完了）
- [x] 実際にOAuthで @digitarod のInstagramアカウントを連携し、本番投稿まで確認（media_id取得済み。ローカルではngrokで一時トンネルして検証。cloudflaredの無料クイックトンネルは実際のリダイレクト経路で502が頻発したため、ngrok(認証あり)に切り替えて解決した）
- [x] トークンの自動リフレッシュ: `interfaces/oauth/instagram-refresh-job.ts`。60日長期トークンの期限7日前を切ったら `GET https://graph.instagram.com/refresh_access_token` で自動延長する常駐ジョブ（サーバー起動時+12時間おき）
- [ ] customers/<実際の顧客名(digitarod以外の一般顧客)>/config.yaml を用意して MCP E2E 確認
- [ ] 拡張予定（ユーザーからの要望あり）: 予約投稿(scheduledFor)・自動リトライ+レート制限キューイング・Webhook通知・ストーリー/リール投稿
- [ ] Graph APIの実際のエラーレスポンス(コード190=トークン失効等)を踏まえて `core/resilience/error-taxonomy.ts` 経由のhintを調整する
- [ ] 本番はVPSデプロイ(固定ドメイン+Traefik)を前提とする。ローカル検証で使ったngrok無料トンネルのURLは再起動のたびに変わりうる(今回は同一ドメインが再利用されたが保証はない)ため、本番のリダイレクトURI登録には使わないこと

### Facebook Developerアプリのセットアップ手順（ユーザー作業）

1. https://developers.facebook.com/apps でアプリを作成（種類: 「Business」）
2. 製品として「Instagram」→「API setup with Instagram login」を追加
3. 「有効なOAuthリダイレクトURI」に `{VAIXIO_PUBLIC_BASE_URL}/oauth/instagram/callback` を登録
4. 開発モード中はテスターとして自分のInstagramビジネス/クリエイターアカウントを追加すれば連携テスト可能（一般顧客に公開するにはApp Reviewでinstagram_business_content_publish等の審査が必要）
5. アプリダッシュボードの「設定」→「基本」からApp IDとApp Secretを取得し、`.env` の `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` に設定

## P7: Postgres + 顧客セルフサービスダッシュボード + 継続開発ループ

詳細な設計判断は計画時のプラン（`ISSUES.md`のD節に要点を転記）を参照。DBはPostgreSQL、
フロントはVite+React SPA(`web/`)、founderが逐一レビューしなくて済むようPM役が定型承認する
`/schedule`ベースの日次ループを回す。

- [x] `core/db/`: Drizzle ORM、schema(customers射影/dashboard_users/dashboard_sessions/audit_events)、
      client.ts、初回マイグレーション、repositories/*（実Postgresに対する統合テスト付き）
- [x] `core/registry/customer-config.ts` → `customers`テーブルへのベストエフォート射影
- [x] `core/telemetry/audit.ts` → `audit_events`テーブルへのベストエフォート射影（dry_runも記録するようAuditEntryスキーマ拡張）
- [x] `core/security/password.ts`: パスワードハッシュ（Node標準crypto.scrypt、argon2はnode:20-slimでネイティブビルド不可のため不採用）
- [x] `interfaces/dashboard-api/`: register/login/logout/me/connections/audit（サービス層ユニットテスト＋HTTPルーティング統合テスト）
- [x] `web/`: Vite+React SPAダッシュボード（サブエージェントに委任、独立性・ビルド・33件のテストを検証済み）
- [x] `docker-compose.yml`にpostgresサービス追加、Dockerfileを2段階ビルド化（web/のビルド込み）。実際に`docker build`→起動→SPA/MCP/dashboard-api疎通まで確認済み
- [x] `.github/workflows/ci.yml`にpostgresサービスコンテナ追加、`db:migrate`をCIに追加。web用ジョブも追加、両方CI green確認済み
- [x] `agents/{pm,engineer,tester,designer}-prompt.md`の初版、`ISSUES.md`新規作成
- [x] **実機の画面確認で発見・修正したバグ2件**（ユニット/統合テストでは検出できなかった）:
  1. 顧客がダッシュボードで新規登録しようとしても、その顧客に対して一度もMCP/RESTのツール呼び出しが行われていないとDB射影が無く「登録されていません」と弾かれる鶏卵問題 → `core/registry/customer-config.ts`の`preloadAllCustomerConfigs()`をサーバー起動時に呼び、`customers/`配下を全件先読みするよう修正
  2. `.env`の`VAIXIO_ALLOWED_HOSTS`が空文字列/コメントアウト漏れの状態で残っていると、空配列のallowedHostsが渡り全リクエストが403になる → `interfaces/mcp/parse-allowed-hosts.ts`を切り出し、空/空白のみの値は「未設定」として扱うよう堅牢化（ユニットテスト付き）。ローカル検証中に複数回踏んだ実際の事故
- [x] **Playwrightによる実ブラウザE2Eテスト**(`e2e/dashboard.spec.ts`)を追加。上記バグ1はまさにこの種のテストでしか検出できなかったため、Tester役が日次で`npm run test:e2e`を回す(`agents/tester-prompt.md`更新済み)。CIにも`e2e`ジョブとして追加
- [ ] `/schedule`で日次ループを実際に登録する
- [ ] customers/digitarod以外の一般顧客での`/dashboard-api/auth/register`実地確認

## P2.5: LINEコネクタ

仕様は`specs/line-connector.md`（実装前に書いてから着手した最初の例）。

- [x] `npm run new-connector line` から開始
- [x] `line.message.send`（destructive: true）/ `line.profile.get`をMeta Graph API方式に
      合わせてLINE Messaging API直接呼び出しで実装（Zernioのような外部SaaSは経由しない）
- [x] fixtureテスト8件（dry_run / 正常系 / エラー系(429, 401) / 404の専用ハンドリング / 未知ツール）
- [x] MCP経由のdry_run呼び出し動作確認済み
- [ ] 既存 hermes-agent の LINE 連携実装との差分確認（本セッションでは hermes-agent の
      コードにアクセスできないため、公開のLINE Messaging API仕様ベースで新規実装した）
- [ ] 実チャネルアクセストークンでのsmokeテスト（`LINE_SMOKE_CUSTOMER`/`LINE_SMOKE_USER_ID`
      が必要。用意でき次第 `npm run smoke -- line`）
- [ ] customers/sample-salon のような実顧客configの雛形を1つ用意
- [ ] Webhook受信（チャットボット機能）はP3のスコープとして別途仕様化する

## P3: 調査基盤の強化

- [ ] flight-recorder を永続化（現状プロセス内メモリのみ、再起動で消える）
- [ ] vaixio.connector.smoke を healthCheck 代替ではなく実際のsmokeテストランナーに接続
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
- Instagramの認可(authorize)エンドポイントは短時間に繰り返し叩くとHTTP 429(レート制限)になりやすい。ローカルでのOAuth動作確認は連続リトライせず、失敗したら数分〜十数分空けてから1回ずつ試すこと。
- `exchangeCodeForToken`(`interfaces/oauth/instagram-connect.ts`)は `api.instagram.com/oauth/access_token` の応答が `{data:[{...}]}` 形式と `{access_token:...}` のフラット形式のどちらでも来うることを実機で確認したため両対応にしてある。
- `customers/<name>/config.yaml` は今も真実の源のまま。`core/db`の`customers`テーブルはダッシュボード用の射影に過ぎず、Router/Registryの許可判定には一切使わない。将来「顧客が自分でallowed_toolsを編集する」機能が要るときに初めてDB主導への切り替えを検討する。
- DB統合テスト(`core/db/**/*.test.ts`, `interfaces/dashboard-api/**/*.test.ts`)は`DATABASE_URL`未設定の環境では自動的に`describe.skip`される設計。ローカルで実行するには`docker run -d -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app_db -p 5432:5432 postgres:16-alpine`のようなテスト用DBを立てて`DATABASE_URL`を設定し、`npm run db:migrate`を先に実行すること。
- `web/`はルートのeslint/tsc設定から完全に除外されている(`ignorePatterns`)。ルートの`npm run lint`/`npm run build`は`web/`を一切見ない。`web/`自身のCI組み込みは`agents/tester-prompt.md`・今後のCI拡張で対応する（現状`.github/workflows/ci.yml`は`web/`をビルド/テストしていない）。
