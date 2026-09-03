# VAIXIO — AI実装者向け規約

最初に読むファイル。詳細な設計思想は `architechure/vaixio-architecture-v2.2.md` を参照
（開発コード名「Musubi」から2026-09-03に改名。ツール名前空間も`vaixio.*`に変更済み）。
ここに書かれた規約は「気をつける」ではなく構造（lint / CI / スキャフォールド）で強制する。

## 0. まずコマンドを覚える

```bash
npm run dev              # 開発サーバー起動（tsx watch）
npm run build             # tsc ビルド
npm test                  # vitest（共通コントラクト＋fixture）
npm run smoke -- <name>   # 実API疎通（例: npm run smoke -- line）
npm run lint               # eslint（境界ルール含む）
npm run check:boundaries   # 依存方向のみを検証
npm run check:core-freeze  # core/ 差分の検知（CI用）
npm run docs:gen            # docs/ 再生成
npm run new-connector <name> # 新コネクタの雛形生成（★これ以外でconnectors/を作らない）
```

## 1. 依存方向（絶対に破らない）

```
connectors/<name>/  →  core/(ports, domain)  のみ
interfaces/          →  core/                のみ
core/                →  core/ 内部のみ（外を知らない）
```

- connector 間の import は禁止（1つの障害が他を巻き込まないため）。
- interfaces から connector を直接 import するのも禁止。必ず core/router 経由。
- `eslint-plugin-boundaries` が `npm run lint` で機械的に検証する。違反はビルドを通さない。

## 2. コア凍結

- 通常のコネクタ追加PRで `core/` に差分が出したら CI (`check:core-freeze`) が落ちる。
- 意図的に core を変更する場合のみ、PRに `core-change-approved` ラベルを付ける。
- 「ついでにcoreも直す」を防ぐための構造的な制約。core変更は別PRに分離すること。

## 3. 新しいコネクタの追加手順

1. `npm run new-connector <platform>` で `connectors/<platform>/` を生成する（手作りフォルダ禁止）。
2. `manifest.json` の `tools[]` を実際のツール定義に書き換え、`schemas/*.json` に JSON Schema を書く。
3. `adapter.ts` の TODO を実装する。**core と外部APIクライアントだけに依存**し、他コネクタ・interfacesは import しない。
4. `adapter.test.ts`（fixture）を実データに合わせて拡充する。
5. `smoke.test.ts` は実API疎通用。`npm run smoke -- <platform>` で手動実行。
6. `npm run docs:gen` で `docs/tool-catalog.md` を更新する（docsは手書き禁止）。

## 4. 境界での zod / JSON Schema 検証

- manifest.json の `inputSchema` は JSON Schema。router が ajv でリクエスト引数を検証してから connector に渡す（境界で落とす）。
- connector 内で外部APIの応答を受け取ったら、必ず自前で構造を検証してから `core/domain/schemas.ts` の型に正規化する。奥で壊れる前に境界で落とす（§8.4）。
- 新しい境界DTOが必要なら `core/domain/schemas.ts` に追加する（コア変更のため上記§2のラベルが必要）。

## 5. エラーは必ず taxonomy に正規化する

- connector の中で例外を投げるのは構わないが、`core/resilience/error-taxonomy.ts` の `classifyError` が router 側で必ず一度は通る。
- `AUTH_EXPIRED / RATE_LIMITED / INVALID_INPUT / UPSTREAM_DOWN / NOT_ALLOWED / UNKNOWN` の6値以外を作らない。
- `hint` には「人とAIが次に何を調べるべきか」を具体的に書く。

## 6. ログ規約

- `console.log` は禁止（eslintで機械的にエラーにする）。
- ログは必ず `core/telemetry/logger.ts` の `log()` を経由する（JSONL 1本に統一、trace_id 必須）。
- 秘匿情報（トークン等のキー名: token/password/secret/authorization/apikey）は `flightRecorder`/`audit` 保存前に自動マスクされる（`core/telemetry/flight-recorder.ts` の `maskArgs`）。新しい秘匿フィールド名を追加した場合はマスク対象に加えること。

## 7. ファイルサイズ・責務

- 目安200行超で分割する（`max-lines` lint ルールが warning を出す）。
- 1ファイル1責務。AIが差分を安全に当てられる粒度を保つ。

## 8. 破壊的操作（destructive: true）

- `manifest.json` で `destructive: true` にしたツールは、顧客の `confirm_policy.destructive: dry_run_first` の下では `dry_run` 引数（boolean）が必須になる（router が自動で強制する。connector 側で個別実装しなくてよい）。
- `dry_run: true` で呼ばれたら実際の副作用を起こさず結果のプレビューだけ返すこと。

## 9. 完成の定義（§8.7）

あるコネクタ/機能が「完成」と言えるのは以下の4点を満たしたとき:

1. 4層テストグリーン（共通コントラクト・fixture単体・smoke・MCP E2E）
2. `vaixio.health` で healthy
3. `npm run docs:gen` の結果に反映されている
4. `npm run lint` / `npm run check:boundaries` / `npm run check:core-freeze` がグリーン

## 10. 顧客スコープ

- `customers/<name>/config.yaml` が顧客専用MCPサーバーの実体（§5）。
- `allowed_tools` に無いツールは `tools/list` にも現れない。存在ごと隠す。
- 資格情報は平文で書かない。必ず `vault://<customer>/<key>` 参照にし、実体は環境変数 `VAULT__<CUSTOMER>__<KEY>`（`core/auth-vault`）で注入する。

## 11. データベース（core/db）

- Postgres（Drizzle ORM）。`core/db/schema.ts`（テーブル定義）・`core/db/client.ts`（`getDb()`/`closeDb()`）・`core/db/repositories/*`（外部から使ってよいのはこれだけ。`schema.ts`/`client.ts`を直接importしない）。
- `customers/<name>/config.yaml` は今も真実の源。`customers`テーブルはダッシュボード用の射影（`core/registry/customer-config.ts`がロードのたびにupsert）。監査ログも`logs/audit/*.jsonl`が真実の源で、`audit_events`テーブルはベストエフォートの射影（DB未接続・DB障害でMCP/RESTのレスポンスパスを壊してはいけない。必ずtry/catchで握りつぶす）。
- マイグレーションは`npm run db:generate`で生成し`core/db/migrations/`にコミットする（core配下なので§2のコア凍結対象）。適用は`npm run db:migrate`を明示的に実行する（コンテナ起動時に暗黙実行しない）。
- DB統合テストは`process.env.DATABASE_URL`が無い環境では`describe.skip`で自動的にスキップされる（`npm test`がDB無しでも壊れないように）。CIは`.github/workflows/ci.yml`のpostgresサービスコンテナに対して実行する。

## 12. ダッシュボード（interfaces/dashboard-api, web/）

- 顧客セルフサービス用の人間ログイン。MCP/REST用のBearerトークン認証とは完全に別の信頼領域（httpOnly Cookie + `dashboard_sessions`テーブル）。混ぜない。
- パスワードは`core/security/password.ts`の`hashPassword`/`verifyPassword`（Node標準`crypto.scrypt`）を使う。argon2/bcryptはネイティブビルドが必要で本番の`node:20-slim`イメージでは使えないため採用しない。
- v1のユーザー登録は「既に`customers/<name>/config.yaml`がコミット済みの既存顧客」限定（`customers`テーブルへの射影が無いcustomer_slugでは登録できない）。全く新規の顧客が自己プロビジョニングしてMCPまで使えるようにする機能は現状スコープ外（`ISSUES.md`参照）。
- `web/`はVite+React SPAで、`core`/`connectors`/`interfaces`を一切importしない完全に別プロジェクト（独自の`package.json`/`tsconfig`/eslint設定を持つ。ルートの`.eslintrc.json`は`web/**`を無視する）。バックエンドとは`/dashboard-api/*`へのfetchのみで通信する。
- Instagram連携ボタンは既存の`GET /oauth/instagram/start?customer=<slug>`へのリンクにするだけで、OAuthフロー自体を`web/`側やdashboard-api側で再実装しない。

## 13. 仕様駆動開発（specs/）

- 新しいツール・API・画面/フロー・DBテーブルを追加する時は、`specs/<subsystem>.md` に
  仕様書を書く（実装前、または実装と同じPRで）。詳細は `specs/README.md`。
- specは「外部から見た振る舞い」を書く。実装の詳細はコード自身が真実の源。
- 実装がspecと乖離したら、気づいた側を直す。specを書かなくてよいのは小さな修正のみ。

## 14. 実ブラウザE2Eテスト（Playwright）

- `e2e/*.spec.ts`（`playwright.config.ts`）。ユニット/統合テストでは検出できない不具合
  （実際に「一度もMCP/RESTを呼ばれていない顧客がダッシュボード登録できない」バグを発見）
  を捕まえるための層。`npm run test:e2e`で実行する。
- 事前に使い捨てPostgresの起動・`npm run db:migrate`・`cd web && npm run build`が必要（`agents/tester-prompt.md`にコマンド例あり）。
- `playwright.config.ts`の`webServer.env`で`VAIXIO_ALLOWED_HOSTS`を明示的に空にしている。
  ローカルの`.env`に値が残っていると127.0.0.1への接続が403になる事故が実際に起きたため。
- ダッシュボードに新しい画面/フローを追加したら、対応するE2Eテストも追加すること（Tester役のPRレビューでこれを確認する）。
