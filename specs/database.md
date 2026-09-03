# データベース（Postgres）

## 目的

顧客セルフサービスダッシュボード（ログイン、連携状況表示、監査履歴閲覧）を実現するために、
ファイルベースの設定（`customers/*/config.yaml`）とJSONLログだけでは足りないデータ
（人間のログイン情報、セッション、問い合わせしやすい形の監査履歴）を保持する。

## 仕様

### 真実の源の方針（最重要）

| データ | 真実の源 | Postgresの役割 |
|---|---|---|
| 顧客の許可ツール一覧・確認ポリシー | `customers/<name>/config.yaml` | `customers`テーブルはベストエフォートの射影のみ。Router/Registryの許可判定には一切使わない |
| 監査ログ（誰が何をしたか） | `logs/audit/<customer>.jsonl` | `audit_events`テーブルはダッシュボード表示用のベストエフォート射影 |
| 顧客のダッシュボードログイン情報 | **Postgresが真実の源** | `dashboard_users` / `dashboard_sessions` |

「ベストエフォート射影」とは: DB未接続・DB障害が発生しても、MCP/RESTのレスポンス
パス（実際のツール呼び出し）は絶対に壊れないという意味。射影書き込みは必ず
try/catchで囲み、失敗は握りつぶす。

### テーブル

- **customers**: `id(uuid)`, `slug(unique)`, `display_name`, timestamps。
  `core/registry/customer-config.ts`が`config.yaml`を読み込むたびにupsertする。
  サーバー起動時に`customers/`配下を全件先読みして射影する
  （`preloadAllCustomerConfigs()`。一度もMCP/REST経由で呼ばれたことのない顧客が
  ダッシュボード登録できない、という不具合を防ぐため）。
- **dashboard_users**: `id`, `customer_id(fk)`, `email(unique)`, `password_hash`,
  `email_verified_at(nullable, 現状未使用)`, `last_login_at`, timestamps。
- **dashboard_sessions**: `id(uuid, Cookieの値そのもの)`, `dashboard_user_id(fk)`,
  `expires_at`（作成から30日）, `user_agent`, `ip`。
- **audit_events**: `id`, `customer_id(fk)`, `tool_name`, `args_digest`, `result`,
  `dry_run`, `latency_ms`, `raw(jsonb)`, `occurred_at`。`core/telemetry/audit.ts`が
  JSONL書き込み直後に射影する。

### マイグレーション

- Drizzle ORM（`core/db/schema.ts`）。`npm run db:generate`でSQLを生成し
  `core/db/migrations/`にコミットする（`core/`配下なのでコア凍結ラベルが必要）。
- 適用は`npm run db:migrate`を**明示的に**実行する。コンテナ起動時に暗黙実行しない
  （意図しないタイミングでのスキーマ変更を防ぐため）。

### 接続設定

- `DATABASE_URL`環境変数（顧客ごとの秘密ではないインフラ設定なので`core/auth-vault`は経由しない）。
- `core/db/client.ts`の`getDb()`は遅延初期化。`DATABASE_URL`が無ければ呼び出し時に
  例外を投げるが、呼び出し側（射影処理）は全てtry/catchしているため、DB未設定でも
  MCP/REST/OAuth連携などの既存機能は問題なく動く。

## 既知の制約・スコープ外

- 単一インスタンス前提。複数Postgresインスタンス間のレプリケーション・フェイル
  オーバーは考慮していない。
- バックアップ運用（`pg_dump`の定期取得等）は本仕様の範囲外（`ISSUES.md`参照）。
- `customers`テーブルをRouter/Registryの許可判定に使う設計への切り替えは、顧客が
  自分でallowed_toolsを編集できるようにする機能が要るときに初めて検討する。

## 関連ファイル

- `core/db/schema.ts` / `client.ts` / `repositories/*`
- `core/registry/customer-config.ts`（customers射影）
- `core/telemetry/audit.ts`（audit_events射影）
- `drizzle.config.ts` / `scripts/db-migrate.ts`
