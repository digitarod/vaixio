# Instagramコネクタ + OAuth連携

## 目的

顧客（サロン等）のInstagramビジネス/クリエイターアカウントに、AIエージェント
（Claude等、MCP経由）または開発者（REST経由）から投稿できるようにする。

当初はZernio(https://zernio.com)という外部SaaS経由で実装したが、founderの方針
「顧客からGraph APIトークンを取得せず、自社サービスとして同等の仕組みを持つ」に
より、Meta Graph APIへの直接呼び出し＋自前のOAuth連携フローに置き換えた。

## 仕様

### OAuth連携フロー（顧客が自分でInstagramアカウントを連携する）

1. 顧客（または営業担当）がブラウザで `GET /oauth/instagram/start?customer=<slug>`
   を開く。`customer`は`customers/<slug>/config.yaml`が存在する既存顧客のみ有効。
2. サーバーはCSRF対策済み`state`（HMAC署名＋10分TTL）を発行し、
   `https://www.instagram.com/oauth/authorize`（Instagram Business Login方式、
   Facebookページ不要）へリダイレクトする。要求スコープ:
   `instagram_business_basic`, `instagram_business_content_publish`。
3. 顧客がInstagram側でログイン・許可すると、`GET /oauth/instagram/callback`に
   認可コードが渡る。サーバーは:
   a. `state`を検証（署名・TTL）
   b. 認可コード→短期トークン（`api.instagram.com/oauth/access_token`）
   c. 短期→長期トークン（60日、`graph.instagram.com/access_token`）
   d. プロフィール取得（`graph.instagram.com/v21.0/me`）
   e. `core/auth-vault/token-store.ts`にAES-256-GCM暗号化して保存
      （`{platform, customer, accessToken, accountId, accountName, obtainedAt, expiresAt}`）
4. 連携完了後、顧客はブラウザに簡単な完了メッセージを見る（ダッシュボード実装後は
   `web/`の連携ページに戻ってくる想定）。

### トークンの自動延長

- Instagramの長期トークンは60日で失効する。`interfaces/oauth/instagram-refresh-job.ts`
  がサーバー起動時＋12時間おきに全トークンを走査し、**期限7日前を切ったもの**を
  `graph.instagram.com/refresh_access_token`で自動延長する。
- Metaの制約: 取得から24時間未満のトークンはリフレッシュできない
  （`token too new to refresh`エラーになる。異常ではない）。

### 投稿ツール: `instagram.post.create`

- **destructive: true**（`confirm_policy: dry_run_first`の顧客では`dry_run`引数が必須。
  routerが自動強制）。
- 入力: `caption`（最大2200文字）, `media`（1〜10件の`{url, type: "image"|"video"}`、
  2件以上でカルーセル投稿）, `first_comment`（任意）, `dry_run`。
- `dry_run: true`: Graph APIへは何も送らず、送信予定の内容（投稿先アカウント名込み）
  をプレビューとして返す。
- `dry_run: false`: 顧客が連携済みのアカウントが無ければ`AUTH_EXPIRED`エラー（連携
  URLをhintに含める）。あれば:
  1. メディアコンテナ作成（`POST /{ig-user-id}/media`。カルーセルは子コンテナを
     先に作ってから親コンテナ）
  2. `status_code`が`FINISHED`になるまでポーリング（最大10回×2秒）
  3. `POST /{ig-user-id}/media_publish`
  4. `first_comment`があれば投稿後にコメント追加（失敗しても投稿自体は成功扱い）
  5. `{media_id, account_id}`を返す

## 既知の制約・スコープ外

- フィード投稿のみ。ストーリー・リール・予約投稿(scheduledFor)・DM/コメントAPI・
  自動リトライ/レート制限キューイング・Webhook通知は未実装（`BACKLOG.md` P2参照）。
- 1つのMeta Developerアプリ・1組のApp ID/Secretを前提。複数アプリの切り替えは
  想定していない。
- Graph APIの実際のエラーコード（例: 190=トークン失効）に基づく`error-taxonomy.ts`の
  hint調整は今後の課題。

## 関連ファイル

- `connectors/instagram/manifest.json` / `adapter.ts` / `schemas/post-create.json`
- `interfaces/oauth/instagram-connect.ts`（OAuthフロー）
- `interfaces/oauth/instagram-refresh-job.ts`（自動延長）
- `core/auth-vault/token-store.ts`（トークン永続化）
