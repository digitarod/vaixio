# Facebookページ コネクタ

> 実装前に書いた仕様（仕様駆動開発）。実装中に判明した差分は実装後に本ファイルへ反映すること。

## 目的

Instagramに続く「発信」パッケージのSNS投稿先。同じMeta Graph APIを使うため、
Instagramコネクタで確立したOAuth連携パターン（顧客はブラウザでログインするだけ）を
そのまま流用でき、実装・運用コストが低い。

## 仕様

### 認証

- Facebook Login（`pages_show_list`, `pages_manage_posts`, `pages_read_engagement`スコープ）。
  `GET /oauth/facebook-page/start?customer=<name>`をブラウザで開くだけで連携が完了する
  （`interfaces/oauth/facebook-page-connect.ts`）。
- ユーザーアクセストークンを短期→長期に交換した後、`/me/accounts`で管理ページ一覧を取得し、
  **最初の1件のページアクセストークン**を保存する（複数ページの選択UIは今回スコープ外。
  Instagramの`fetchProfile`と同じ簡略化方針）。
- 長期ユーザートークンから発行されたページアクセストークンは実質的に失効しないため、
  Instagramのような定期リフレッシュジョブは不要（`expiresAt: null`で保存）。
- 必須環境変数: `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` / `VAIXIO_PUBLIC_BASE_URL` /
  `OAUTH_STATE_SECRET`（後2つはInstagram/GBP連携と共用）。InstagramのMeta
  Appと同じアプリを使い回しても、別アプリにしてもどちらでも良い（VAIXIO側は関知しない）。

### ツール: `facebook_page.post.create`

- **destructive: true**（`confirm_policy: dry_run_first`の顧客ではrouterが`dry_run`を強制）。
- 入力: `message`（本文、必須、最大5000文字）, `image_url`（画像1枚のURL、任意）,
  `link`（リンクURL、任意。`image_url`と同時指定は想定しない）。
- `dry_run: true`: Graph APIへは投稿せず、投稿予定の内容をプレビューとして返す。
- `dry_run: false`:
  - `image_url`指定時: `POST /{page-id}/photos`（`url`, `caption`）
  - 未指定時: `POST /{page-id}/feed`（`message`, `link`）
  - 成功時は`{post_id, page_id}`を返す。
  - 失敗時はGraph APIのエラーレスポンスを`classifyError`でtaxonomyに正規化する
    （401/403→`AUTH_EXPIRED`、429→`RATE_LIMITED`、400→`INVALID_INPUT`、5xx→`UPSTREAM_DOWN`）。

## 既知の制約・スコープ外

- 1顧客につき1ページのみ（複数ページ運用・ページ選択UIは未対応）。
- カルーセル（複数画像）投稿・動画投稿は未対応（Instagramの複雑なコンテナ生成フローは
  Facebookページでは今回持ち込まない。要望が出たら別途対応）。
- 実際のMeta AppでのOAuth連携・投稿のsmokeテストは、Facebook Appの審査状況次第で
  別途`npm run smoke -- facebook-page`で行う（本セッションではfixtureテストのみで実施）。

## 関連ファイル

- `connectors/facebook-page/manifest.json` / `adapter.ts` / `schemas/post-create.json`
- `connectors/facebook-page/adapter.test.ts`（fixture）
- `connectors/facebook-page/smoke.test.ts`
- `interfaces/oauth/facebook-page-connect.ts`（OAuth連携フロー）

## 実装後の差分メモ

仕様通りに実装。fixtureテストで動作確認済み。実Meta App・実Facebookページでのsmokeテストは
未実施（Meta Appの審査/権限付与状況に応じて別途`npm run smoke -- facebook-page`で行う）。
