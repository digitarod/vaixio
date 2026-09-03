# LINEコネクタ

> 実装前に書いた仕様（仕様駆動開発）。実装中に判明した差分は実装後に本ファイルへ反映すること。

## 目的

Musubi「発信」パッケージの中心ツール。既存のLINEチャットボット事業（hermes-agent）を
Musubi基盤に載せ替える最初の一歩として、AIエージェント（MCP経由）または開発者
（REST経由）からLINEメッセージを送信できるようにする。

## 仕様

### 認証

- LINE Messaging APIの**チャネルアクセストークン**（長期）を使う。OAuthのような
  顧客自己連携フローは無い（LINE Official Accountの管理画面でチャネルアクセス
  トークンを発行し、顧客からMusubi運用者に渡してもらう運用を想定）。
- `customers/<name>/config.yaml`の`credentials.line: vault://<name>/line`経由で
  `VAULT__<NAME>__LINE`環境変数に注入する（`core/auth-vault`の既存の仕組みをそのまま使う。
  Instagramのようなコネクタ単位のvaultではなく、**顧客ごと**のチャネルトークンである点が
  Instagramとの違い。1つのMusubi運用者が複数の顧客の別々のLINE公式アカウントを
  扱う想定のため）。

### ツール1: `line.message.send`

- **destructive: true**（`confirm_policy: dry_run_first`の顧客ではrouterが`dry_run`を強制）。
- 入力: `to`（LINEのuserId/groupId/roomId、必須）, `message`（テキスト、最大5000文字、必須）。
- `dry_run: true`: LINE APIへは送信せず、送信予定の内容をプレビューとして返す。
- `dry_run: false`: LINE Messaging APIの`POST https://api.line.me/v2/bot/message/push`を
  `Authorization: Bearer <チャネルアクセストークン>`で呼び出す。
  - 成功: `{ok: true}`相当のみ返る（LINE API自体は成功時ボディが空）。`{delivered: true}`を返す。
  - 失敗: LINE APIのエラーレスポンス（`{message, details}`形式）を`classifyError`で
    taxonomyに正規化する。401→`AUTH_EXPIRED`、429→`RATE_LIMITED`、400→`INVALID_INPUT`。

### ツール2: `line.profile.get`

- **destructive: false**。
- 入力: `userId`（必須）。
- `GET https://api.line.me/v2/bot/profile/{userId}`を呼び出し、
  `{displayName, userId, pictureUrl?, statusMessage?}`を返す（LINE APIの応答をzodで
  検証してから正規化する。§8.4）。
- 対象ユーザーがBotをブロックしている場合など404が返るケースは`NOT_ALLOWED`ではなく
  `UPSTREAM_DOWN`ではなく専用に扱う: `INVALID_INPUT`（「指定のuserIdは友だち追加/
  ブロック解除されていないため取得できません」とhintに書く）。

## 既知の制約・スコープ外

- **Webhook受信（ユーザーからのメッセージ受信、チャットボット機能）は今回のスコープ外**。
  これはMusubi「チャットボット」パッケージ（P3寄り）の領域であり、署名検証
  （`X-Line-Signature`）を含む別仕様として扱う。
- グループ/ルームへのメッセージ送信は`to`にgroupId/roomIdを渡せば動く想定だが、
  実機での確認はテキストのuserId宛のみ（fixtureテストの範囲）。
- 画像・スタンプ・リッチメニュー等、テキスト以外のメッセージタイプは今回未対応。
- 実際のLINEチャネルアクセストークンでの smoke テストは、顧客のLINE公式アカウントの
  チャネルトークンが用意でき次第、別途`npm run smoke -- line`で行う（本セッションでは
  fixtureテストのみで実施、実APIへの疎通は未確認）。

## 関連ファイル

- `connectors/line/manifest.json` / `adapter.ts` / `schemas/{message-send,profile-get}.json`
- `connectors/line/adapter.test.ts`（fixture、8件）
- `connectors/line/smoke.test.ts`（`LINE_SMOKE_CUSTOMER`・`LINE_SMOKE_USER_ID`が
  設定されている時のみ実疎通確認する。本セッションでは未実施）

## 実装後の差分メモ

仕様通りに実装。fixtureテスト・MCP経由のdry_run呼び出し（`line.message.send`）まで
動作確認済み。実チャネルアクセストークンでのsmokeテストは未実施（LINE公式アカウントの
チャネルトークンが用意でき次第、`RUN_SMOKE=1 LINE_SMOKE_CUSTOMER=<name>
LINE_SMOKE_USER_ID=<uid> npm run smoke -- line`で実行する）。
