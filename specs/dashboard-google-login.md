# ダッシュボードのGoogleログイン

> 実装前に書いた仕様（仕様駆動開発）。実装中に判明した差分は実装後に本ファイルへ反映すること。

## 目的

顧客セルフサービスダッシュボード（`specs/dashboard-api.md`）のログイン方法として、
既存のメール＋パスワードに加えて「Googleでログイン」を追加する。パスワードを
作らずに済むログイン手段が欲しい、という利便性向上が目的。

## 仕様

### OAuthフロー（Google OpenID Connect、Authorization Codeフロー）

1. `GET /dashboard-api/auth/google/start?customer_slug=<slug省略可>`
   - 新規登録目的で使う場合は `customer_slug` を付ける（既存の`customers`テーブルに
     存在する顧客のみ有効。§dashboard-api.md の登録スコープ制約と同じ）。
   - 既存ユーザーのログインだけが目的なら `customer_slug` は不要。
   - CSRF対策の`state`（HMAC署名＋10分TTL、Instagram連携時と同じ方式）に
     `customer_slug`（あれば）を埋め込み、
     `https://accounts.google.com/o/oauth2/v2/auth` にリダイレクトする。
     スコープ: `openid email profile`。
2. `GET /dashboard-api/auth/google/callback`
   - `state`を検証し、認可コードを `https://oauth2.googleapis.com/token` でトークンに交換。
   - `https://openidconnect.googleapis.com/v1/userinfo` を呼び、
     `{sub, email, email_verified, name, picture}` を取得。
   - 以下の優先順で処理する:
     a. `google_id`(=`sub`)が既存の`dashboard_users`に一致 → そのままログイン（セッション発行）
     b. 一致しないが`email`が既存の`dashboard_users`に一致 → そのアカウントに`google_id`を
        紐付けて（アカウント統合）ログイン
     c. どちらにも一致せず、`state`に有効な`customer_slug`が含まれる → 新規`dashboard_users`
        作成（`password_hash`は無し）してログイン
     d. どちらにも一致せず`customer_slug`も無い → 400エラー「先に新規登録画面からお客様IDを
        指定して登録してください」
   - 成功時はダッシュボードの`/connections`にリダイレクト（既存のダッシュボードSPAへの
     フルページ遷移。Instagram連携完了時と同じパターン）。

### DBスキーマ変更（core-freeze対象、coreの変更として別途ラベルが必要な規模の変更）

- `dashboard_users.password_hash` を **NOT NULL → NULL許容** に変更（Google経由の
  アカウントはパスワードを持たない）。
- `dashboard_users.google_id`（text, nullable, unique）を追加。

### フロントエンド（web/）

- ログイン画面・登録画面の両方に「Googleでログイン」ボタンを追加。
  登録画面のボタンはお客様ID入力欄の値を`customer_slug`として`/auth/google/start`に付与する
  （フォーム送信ではなく通常のリンク遷移。Instagramの連携ボタンと同じ、フルページ遷移パターン）。
- 既存のメール＋パスワードのフォームはそのまま残す（併存、どちらでもログイン可能にする）。

## 既知の制約・スコープ外

- Googleアカウントのメールアドレスが確認済み(`email_verified: true`)であることは確認するが、
  厳密なドメイン制限（特定の会社ドメインのみ許可等）は行わない。
- パスワードを持たないGoogle専用アカウントに、後から自分でパスワードを設定する機能
  （アカウント設定画面）は今回のスコープ外。
- リフレッシュトークンは要求しない（`access_type=online`、ログインのためだけに使い、
  Google Driveなど他のGoogle APIへの継続アクセスは想定しない）。

## 関連ファイル

- `interfaces/dashboard-api/google-auth.ts`（OAuthフロー本体）
- `interfaces/dashboard-api/auth-service.ts`の`loginOrRegisterWithGoogle`（google_id一致→email一致→新規作成の判定ロジック）
- `core/db/schema.ts`（`dashboard_users.password_hash`をnullable化、`google_id`列追加）、
  `core/db/migrations/0001_late_lord_hawal.sql`
- `web/src/components/forms/GoogleLoginLink.tsx`（Login/RegisterForm両方から使う共通リンク）
- `e2e/dashboard.spec.ts`（ボタンのhref検証。実際のGoogleログインまでは自動テストしていない）

## 実装後の差分メモ

仕様通りに実装。ユニットテスト14件（auth-service 10件、dashboard-users repository 7件中3件が新規、
google-auth HTTPルーティング3件）＋フロントのコンポーネントテスト2件＋E2E2件で検証済み。
実際にサーバーを起動し、`/dashboard-api/auth/google/start`が正しいGoogle認可URLへ
リダイレクトすることをダミー認証情報で確認済み。実際のGoogle Cloud OAuthクライアントでの
本番動作確認は未実施（`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`の発行が必要）。
