# Googleビジネスプロフィール コネクタ

> 実装前に書いた仕様（仕様駆動開発）。実装中に判明した差分は実装後に本ファイルへ反映すること。

## 目的

VAIXIO「発信」パッケージに、Googleビジネスプロフィール（旧Googleマイビジネス）を追加する。
顧客からの主な要望は「口コミ(レビュー)への返信をAIエージェントに任せたい」であり、まずは
拠点情報の把握とレビューの取得・返信ができるようにする。

## 仕様

### 認証

- Google OAuth2（`https://www.googleapis.com/auth/business.manage`スコープ）。Instagramと同様に
  顧客はブラウザで`GET /oauth/google-business-profile/start?customer=<name>`を開いてGoogleアカウントで
  ログインするだけで連携が完了する（`interfaces/oauth/google-business-profile-connect.ts`）。
- Googleのアクセストークンは**約1時間で失効する**。Instagramの長期トークン(60日)とは前提が大きく異なり、
  12時間おきの定期ジョブでは間に合わないため、定期リフレッシュジョブは持たない。代わりに
  `access_type=offline`+`prompt=consent`で連携時に必ず`refresh_token`を取得し、
  `connectors/google-business-profile/adapter.ts`が**呼び出しの都度**有効期限(残り5分未満)を
  確認してrefresh_tokenで更新する。
  - これに伴い`core/domain/schemas.ts`の`OAuthTokenRecord`に`refreshToken`（optional）を追加した
    （core変更。§2により本来は`core-change-approved`ラベルを付けた別PRに分離する）。
  - `refresh_token`が得られなかった場合（既に一度許可済みのGoogleアカウントで`prompt=consent`が
    効かないケースなど）はconnect時点でエラーにし、Googleアカウント側の連携解除→再連携を促す。
- 必須環境変数: `GOOGLE_BUSINESS_PROFILE_CLIENT_ID` / `GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET` /
  `VAIXIO_PUBLIC_BASE_URL` / `OAUTH_STATE_SECRET`（後2つはInstagram連携と共用）。
  ダッシュボードログイン用の`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`（`interfaces/dashboard-api/google-auth.ts`）
  とはスコープの信頼領域が異なるため、あえて別のGoogle Cloud OAuthクライアントを想定し共用しない。

### ツール1: `google_business_profile.location.list`

- **destructive: false**。入力なし。
- Account Management API (`GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`)で
  アカウント一覧を取得し、各アカウントについてBusiness Information API
  (`GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations`)で
  拠点一覧を取得、`{accountId, locationId, name, address}`にフラット化して返す。
- review系ツールは`accountId`/`locationId`の両方を要求するため、顧客/AIエージェントは
  まずこのツールで対象拠点を特定する運用を想定。

### ツール2: `google_business_profile.review.list`

- **destructive: false**。入力: `accountId`, `locationId`（必須）, `pageSize`（任意、最大50、既定20）。
- レビュー本体は新しいBusiness Information APIには無く、レガシーの
  My Business API v4 (`GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews`)
  が引き続き唯一の取得経路（Googleの提供状況変化に注意。§8.4により応答は必ずzodで検証してから正規化）。
- `{reviews: [{reviewId, reviewerName, starRating, comment, createTime, reply}], averageRating, totalReviewCount}`を返す。

### ツール3: `google_business_profile.review.reply`

- **destructive: true**（`confirm_policy: dry_run_first`の顧客ではrouterが`dry_run`を強制）。
- 入力: `accountId`, `locationId`, `reviewId`, `comment`（最大4096文字、必須）。
- `dry_run: true`: APIへは送信せず、返信予定の内容をプレビューとして返す。
- `dry_run: false`: My Business API v4の
  `PUT https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply`
  を`{comment}`ボディで呼び出す（既に返信済みのレビューへの呼び出しは上書き更新になる、Google側の仕様）。
  - 失敗時は`classifyError`でtaxonomyに正規化する（401/403→`AUTH_EXPIRED`、429→`RATE_LIMITED`、
    400/422→`INVALID_INPUT`、5xx→`UPSTREAM_DOWN`）。

## 既知の制約・スコープ外

- レビューへの返信・一覧取得・拠点一覧のみが対象。ローカル投稿(Google Posts)や
  Q&A、写真管理、インサイト(パフォーマンス指標)は今回未対応（要望が出た時点で別ツールとして追加）。
- My Business API v4はGoogleが新規アクセスを制限しているレガシーAPIであり、Google Cloud
  プロジェクト側でAPIアクセスの承認申請が必要な場合がある（VAIXIO側の実装では制御できない外部制約）。
- 複数アカウント/複数拠点を持つ顧客について、`location.list`は全アカウント×全拠点を返す
  （ページネーションは今回未対応。拠点数が非常に多い顧客では取得漏れが起きうる）。
- 実際のGoogle OAuthクライアント・Business Profileアカウントでのsmokeテストは、顧客の
  Google Cloud OAuthクライアントとテスト用ビジネスアカウントが用意でき次第、別途
  `npm run smoke -- google-business-profile`で行う（本セッションではfixtureテストのみで実施）。

## 関連ファイル

- `connectors/google-business-profile/manifest.json` / `adapter.ts` /
  `schemas/{location-list,review-list,review-reply}.json`
- `connectors/google-business-profile/adapter.test.ts`（fixture）
- `connectors/google-business-profile/smoke.test.ts`（`GBP_SMOKE_CUSTOMER`が設定されている時のみ実疎通確認する）
- `interfaces/oauth/google-business-profile-connect.ts`（OAuth連携フロー）
- `core/domain/schemas.ts`の`OAuthTokenRecord.refreshToken`（core変更）

## 実装後の差分メモ

仕様通りに実装。fixtureテストで動作確認済み。実Google OAuthクライアント・実Business Profile
アカウントでのsmokeテストは未実施（`RUN_SMOKE=1 GBP_SMOKE_CUSTOMER=<name> npm run smoke -- google-business-profile`
で用意でき次第実行する）。
