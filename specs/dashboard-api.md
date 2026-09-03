# ダッシュボードAPI（interfaces/dashboard-api）

## 目的

顧客（サロン等の担当者）が、AIエージェント向けのMCP/RESTとは別に、人間としてログインして
「自分のOAuth連携状況」「自分の監査履歴（AIに何をさせたか）」を自分で見られるようにする。
founderが逐一問い合わせ対応しなくて済むセルフサービス化が目的。

## 仕様

### 認証モデル（MCP/RESTとは完全に別の信頼領域）

- httpOnly・Secure（本番）・SameSite=Laxの`dashboard_session` Cookie。値は
  `dashboard_sessions.id`（UUID）そのもの。
- パスワードは`core/security/password.ts`（Node標準`crypto.scrypt`、ソルト付き）。
- MCP/REST用のBearerトークン認証とは検証経路もデータも一切混ぜない。

### 登録スコープ（v1の意図的な制約）

顧客側の新規登録は**「既に`customers/<name>/config.yaml`がコミット済みの既存顧客」限定**。
Web経由で全く新規の顧客が自己登録してMCPまで即座に使えるようになる機能（フル
セルフプロビジョニング）は**スコープ外**。理由: Router/Registryは今も`config.yaml`を
唯一の許可判定の真実の源としており、DB上に`customers`レコードが（射影として）
存在するだけではMCP/RESTの許可には繋がらない。

### エンドポイント

全て`/dashboard-api/*`配下。リクエスト/レスポンスはJSON（登録/ログイン成功時は
`Set-Cookie`も返す）。

| メソッド・パス | 認証 | 概要 |
|---|---|---|
| `POST /auth/register` | 不要 | `{customer_slug, email, password}`。password 10文字未満は400。`customer_slug`が`customers`テーブルに無ければ404 `CUSTOMER_NOT_FOUND`。emailが既存なら409 `EMAIL_TAKEN`。成功時201＋Cookie発行 |
| `POST /auth/login` | 不要 | `{email, password}`。不一致は401 `INVALID_CREDENTIALS`（存在有無を区別しない文言） |
| `POST /auth/logout` | Cookie | セッション削除。204 |
| `GET /me` | Cookie | `{email, customerSlug}`。未認証は401 |
| `GET /connections` | Cookie | 自分の顧客に紐づくOAuth連携一覧（`{platform, accountName, expiresAt}[]`。**アクセストークン本体は絶対に返さない**） |
| `GET /audit` | Cookie | 直近50件の監査イベント（`audit_events`由来、新しい順） |

### エラーレスポンス形

`{error: <コード文字列>}`。フロントエンド（`web/`）側でコードを日本語文言に変換する
（`web/src/lib/errorMessages.ts`）。バックエンド側で日本語文言を組み立てない
（フロント側に表示文言を一元化するため。バリデーション系の400は例外的に
バックエンドが直接日本語文を返す場合がある）。

## 既知の制約・スコープ外

- メールアドレスの所有確認（確認メール送信）・パスワードリセットは未実装
  （メール送信基盤が無いため。`dashboard_users.email_verified_at`列だけ用意済み）。
- ログイン試行のレート制限は最低限（ISSUES.md参照）。
- 1顧客(customer_id)に複数のdashboard_userを持てる設計（担当者が複数人いる想定）
  だが、権限の差分（閲覧のみ/管理者等）は無く全員同じ権限。

## 関連ファイル

- `interfaces/dashboard-api/mount.ts`（ルーティング・Cookie配線）
- `interfaces/dashboard-api/auth-service.ts`（登録/ログイン/ログアウトのロジック）
- `core/db/repositories/{customers,dashboard-users,dashboard-sessions,audit}.ts`
