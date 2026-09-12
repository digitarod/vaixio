# 予約投稿（vaixio.post.schedule）

> 実装前に書いた仕様（仕様駆動開発）。実装中に判明した差分は実装後に本ファイルへ反映すること。

## 目的

AIエージェントが「今すぐ」ではなく「未来の指定時刻に」ツール呼び出しを実行できるようにする。
これにより、AIエージェント（や外部スケジューラー）が常時オンラインでなくても、
「毎週月曜9時にキャンペーン告知を投稿する」のような定期/自動投稿が成立する。

VAIXIOは元々「AIエージェントから呼ばれた瞬間にツールを実行するだけの提供者」であり、
スケジューリング機能自体は持っていなかった。これを埋める、コネクタに依存しない
汎用的な仕組みとして`vaixio.*`メタツールに追加する。

## 仕様

### アーキテクチャ上の位置づけ

- コネクタ横断の機能のため、特定のconnectorには置かない。`core/diagnostics/`配下に
  `vaixio.health`等と同様の"メタツール"として実装する（`core/diagnostics/scheduled-posts-tools.ts`）。
- 実行の永続化には**Postgresそのものが唯一の真実の源**となる（`customers`テーブルや
  `audit_events`テーブルのような「YAML/JSONLのベストエフォート射影」ではない点が既存の
  DB利用方針との違い）。そのため、この機能群は`DATABASE_URL`未設定の環境では
  明示的に`UPSTREAM_DOWN`エラーを返す（MCP/REST自体は従来通りDB無しで動作し続ける）。
- 実行のトリガーは`interfaces/scheduler/scheduled-posts-job.ts`の定期ジョブ
  （30秒間隔でポーリング）。`Router.handleToolCall`をそのまま呼ぶため、
  `allowed_tools`・dry_run強制・エラー分類・監査ログなど、通常のMCP/REST経由の
  呼び出しと全く同じガバナンスが適用される。

### ツール1: `vaixio.post.schedule`

- **destructive: true**（`confirm_policy: dry_run_first`の顧客では`dry_run`必須）。
- 入力: `tool_name`（予約したいツール名、必須）, `args`（そのツールへの引数、必須）,
  `scheduled_at`（ISO8601の未来日時、必須）。
- バリデーション:
  - `tool_name`が`vaixio.`で始まる場合は拒否（メタツール自体は予約不可）。
  - `tool_name`がconnectors配下に実在しない場合は拒否。
  - `scheduled_at`が過去/不正な日時なら拒否。
  - **`args`の中身自体はスケジュール時点ではinputSchema検証しない**。実行時刻に
    `Router.handleToolCall`が呼ばれた際に通常通り検証され、不正なら`failed`として
    記録される（スケジュール時に二重に検証ロジックを持たない設計判断）。
- `dry_run: true`: DBには書き込まず、登録される予定の内容をプレビューとして返す。
- `dry_run: false`: `scheduled_posts`テーブルに`status: pending`で1行作成し、`id`を返す。

### ツール2: `vaixio.post.schedule.list`

- **destructive: false**。入力なし。呼び出し元顧客(`ctx.customer`)の予約投稿一覧を
  `scheduled_at`昇順で返す（`id`, `tool_name`, `args`, `scheduled_at`, `status`,
  `published_at`, `error_message`）。

### ツール3: `vaixio.post.schedule.cancel`

- **destructive: false**（実行前の予約を取り消すだけで、外部サービスへの副作用が
  起きないため。既に`published`/`failed`/`cancelled`の予約は再度cancel不可）。
- 入力: `id`（必須）。呼び出し元顧客の所有物かつ`status: pending`のものだけ取消可能。
  他顧客の予約IDを指定しても`INVALID_INPUT`（存在有無を区別しない）。

### 実行ジョブ（interfaces/scheduler/scheduled-posts-job.ts）

- 30秒おきに`status: pending`かつ`scheduled_at <= now()`の行を全顧客分ポーリングする。
- 各行について`Router.handleToolCall({toolName, args, customer: <該当顧客のslug>,
  traceId, forceDryRun: false})`を呼ぶ（`forceDryRun: false`を明示することで、
  `confirm_policy: dry_run_first`によるdry_run強制をスキップする。予約時点で
  「実行してよい」という意思決定は済んでいる前提のため）。
- 成功なら`status: published`、失敗なら`status: failed`+`error_message`を記録する。
  ジョブ自体は例外を飲み込み、次のポーリングを継続する。
- `DATABASE_URL`未設定/DB接続不可の場合は、予約投稿機能を使っていない環境とみなし
  静かにスキップする（プロセスを落とさない、既存のInstagramトークン更新ジョブと同じ方針）。

## 既知の制約・スコープ外

- 繰り返し予約（cron式のような「毎週月曜」の定期実行）は無い。1回きりの未来時刻予約のみ。
  繰り返しが欲しい場合は、AIエージェント側が都度`vaixio.post.schedule`を呼んで
  次回分を積み直す運用を想定（VAIXIO自体はcron機能を持たない）。
- ポーリング間隔が30秒のため、`scheduled_at`ちょうどの秒単位の精度は保証しない
  （最大30秒程度の遅延がありうる）。
- 予約実行時、`confirm_policy: dry_run_first`のdry_run強制は意図的にスキップする
  （§8の「破壊的操作にはdry_run必須」という通常ルールの例外。予約という行為自体が
  実行意思の確認になっているという設計判断）。

## 関連ファイル

- `core/db/schema.ts`の`scheduledPosts`テーブル、`core/db/migrations/0002_*.sql`（core変更）
- `core/db/repositories/scheduled-posts.ts` / `scheduled-posts.test.ts`
- `core/diagnostics/scheduled-posts-tools.ts` / `scheduled-posts-tools.test.ts`
- `core/diagnostics/tools.ts`（`buildDiagnosticTools`への組み込み）
- `interfaces/scheduler/scheduled-posts-job.ts` / `scheduled-posts-job.test.ts`
- `interfaces/mcp/server.ts`（`startScheduledPostsJob(router)`の起動）

## 実装後の差分メモ

仕様通りに実装。fixtureテスト・DB統合テスト(`DATABASE_URL`設定時)ともに動作確認済み。
`core/db/schema.ts`・`core/db/repositories/scheduled-posts.ts`・
`core/diagnostics/scheduled-posts-tools.ts`・`core/diagnostics/tools.ts`が
core配下の変更のため、§2により`core-change-approved`ラベルが必要な変更として扱うこと。
