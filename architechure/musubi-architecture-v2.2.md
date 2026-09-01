# Musubi（結び）アーキテクチャ設計書 v2.2（MCPファースト版）

**プロダクト名**: Musubi — サービスとAIエージェントを「結ぶ」統合ハブ。リポジトリ名 `musubi`、顧客向けMCPエンドポイントは `mcp.<ドメイン>/mcp/<顧客名>` を想定。
**版数**: v2.2（2026-09-01）— v2.1 からの変更: 商品ラインナップ（発信/チャットボット/決済）を §1.3 に追加。v2.0: プロダクト名を Musubi に決定。v1.0 → v2.0: MCPを第一の提供形態に格上げ、AI（Opus/Sonnet）による実装を前提とした疎結合・可観測性の強化
**目的**: 「企業の業務ツールをAIエージェントから安全に使わせる」ポジションを狙う統合ハブの設計指針。実装はClaude Code（Opus/Sonnet）に委任するため、**トラブル時に人とAIの双方が調査しやすい構造**を最重要要件とする。

---

## 1. 思想とポジション

### 1.1 狙うポジション
- **「顧客専用MCPサーバーを立てる」ことを商品にする。**
  顧客は設定にURLを1行足すだけで、Claude・Cursor・自社エージェントから自分の業務ツール群（LINE、予約システム、SNS等）を操作できるようになる。
- APIは廃止しない。**同じツール定義からMCPとRESTの両方を自動生成**し、開発者向けにはREST、エージェント向けにはMCPを出す。
- 差別化は「安全に使わせる」側に置く: 顧客ごとのツール許可リスト、破壊的操作の確認フロー、全操作の監査ログ。

### 1.2 設計原則（v2）
1. **Single Source of Truth**: ツール定義（manifest＋スキーマ）が唯一の真実。MCPツール一覧・RESTルート・ドキュメント・テスト雛形はすべてそこから生成する。
2. **疎結合**: コネクタ同士は互いを知らない。コネクタとコアはポート（インターフェース）とスキーマ検証済みDTOのみで会話する。1つのコネクタの障害が他を巻き込まない。
3. **調査可能性ファースト**: すべてのリクエストに trace_id。障害調査は「ログを grep する」ではなく「MCPツールでハブ自身に聞く」で完結させる。
4. **AI実装ガードレール**: 規約は CLAUDE.md に置き、構造で強制する（lint境界・CI差分チェック・スキャフォールド）。「気をつける」ではなく「壊せない」を目指す。

### 1.3 商品ラインナップ
Musubi は共通基盤（単一ブランド）とし、その上のパッケージとして以下を展開する。パッケージが違ってもコネクタ・監査ログ・顧客config（customers/）はすべて共有し、開発を二重化しない。顧客ブランド（例: 美容室向けサービス）の裏側基盤としてホワイトレーベル的に組み込める。

| パッケージ | 内容 | 主なコネクタ/ツール | 備考 |
|---|---|---|---|
| **Musubi 発信** | 各プラットフォームへの配信・通知 | line.message.send / instagram.post.create / whatsapp.message.send 等の message/post 系 | コネクタそのままで最初に商品化しやすい。P2の中心 |
| **Musubi チャットボット** | Webhook受信＋AI応答 | *.webhook.receive ＋ 頭脳（Hermes Agent / Claude API） | 既存のLINEチャットボット事業をこの構成に載せ替え、最初の事例とする |
| **Musubi 決済** | 決済の実行・照会 | stripe.* / paypay.* 等 | destructive＋dry_run→confirm＋監査ログが最も効く領域。カード情報は保持せず決済事業者に委ねる |

コネクタ実装の優先順位もこの順とする: 発信系 → チャットボット系（Webhook）→ 決済系。

---

## 2. 全体アーキテクチャ

```
 AIエージェント（Claude / Cursor / Hermes Agent / 顧客のエージェント）
        │  MCP (Streamable HTTP)
        ▼
 ┌────────────────────────── Hostinger VPS ──────────────────────────┐
 │ Traefik（既存・触らない）                                            │
 │   ├─ hermes-agent（既存・LINE連携済み）                              │
 │   └─ musubi（新規）                                        │
 │        interfaces/                                                 │
 │          ├─ mcp/    ← 主入口: /mcp/<customer>（顧客別スコープ）      │
 │          └─ rest/   ← 副入口: registryから自動生成                   │
 │        core/                                                       │
 │          ├─ registry/    ツール定義の真実の源                        │
 │          ├─ router/      tool名 → connector 解決                    │
 │          ├─ telemetry/   trace / 構造化ログ / フライトレコーダ        │
 │          ├─ resilience/  サーキットブレーカ / エラー分類              │
 │          └─ auth-vault/  資格情報の一元管理                          │
 │        connectors/  line/ instagram/ ...（プラグイン・相互参照禁止）   │
 └────────────────────────────────────────────────────────────────────┘
        │ 外部API（LINE / Instagram / 予約システム ...）
```

開発: GCP VM（Claude Code / Cowork in Chrome）、CI: GitHub Actions、デプロイ: イメージpull方式（v1と同じ）。

---

## 3. リポジトリ構成

```
musubi/
├── CLAUDE.md                  # AI実装者向け規約（§8）。最初に読む
├── core/
│   ├── domain/                # 統一スキーマ（zod）。境界のDTOはすべてここ
│   ├── ports/                 # Connector インターフェース
│   ├── registry/              # ツール定義集約 → MCP/REST/docs/テスト雛形を生成
│   ├── router/                # tool名 → connector 解決・実行
│   ├── telemetry/             # trace_id / JSONLロガー / flight-recorder
│   ├── resilience/            # circuit-breaker / エラー分類（§6.3）
│   └── auth-vault/
├── connectors/
│   └── line/
│       ├── manifest.json      # ツール宣言（§4）
│       ├── adapter.ts         # ports実装のみ。coreへの逆依存・他connector参照は禁止
│       ├── adapter.test.ts    # fixture単体テスト
│       └── smoke.test.ts      # 実API疎通（単体指名実行）
├── interfaces/
│   ├── mcp/                   # MCPサーバー（主入口）＋顧客スコープ解決
│   └── rest/                  # RESTゲートウェイ（registryから自動生成）
├── customers/
│   └── <顧客名>/config.yaml   # 公開ツール許可リスト・資格情報参照・確認フロー設定
├── tools/
│   └── scaffold/              # `npm run new-connector <name>` 雛形生成
├── docs/                      # 自動生成（手書き禁止）
├── test-reports/              # Cowork E2E 出力
├── BACKLOG.md
├── docker-compose.yml / Dockerfile
```

実装言語: TypeScript / Node.js。スキーマ検証は zod（JSON Schema へ変換して MCP の inputSchema に流用）。

---

## 4. ツール定義 = 真実の源（registry）

### 4.1 manifest.json（コネクタごと）
```json
{
  "platform": "line",
  "version": "1.0.0",
  "tools": [
    {
      "name": "line.message.send",
      "description": "指定ユーザー/グループにLINEメッセージを送信する",
      "inputSchema": "schemas/message-send.json",
      "destructive": true
    },
    {
      "name": "line.profile.get",
      "description": "ユーザープロフィールを取得する",
      "inputSchema": "schemas/profile-get.json",
      "destructive": false
    }
  ],
  "auth": { "type": "channel_token" }
}
```

### 4.2 registry から生成されるもの
| 生成物 | 用途 |
|---|---|
| MCP tools/list 応答 | エージェントが自己発見。ドキュメント不要の組み込み |
| REST ルート（POST /v1/tools/line.message.send） | 開発者向け副入口。実装は同一ルータに委譲 |
| docs/ | ツールカタログ（顧客提案資料の元ネタ） |
| テスト雛形 | 新コネクタのコントラクトテストを自動生成 |

**受け入れ基準**: コネクタのフォルダを追加すると、再起動だけで MCP・REST・docs に反映される。

---

## 5. 顧客スコープ（商品の単位）

`customers/<name>/config.yaml` が「顧客専用MCPサーバー」の実体。

```yaml
customer: sample-salon
mcp_path: /mcp/sample-salon        # 顧客に渡すURL（Bearerトークン必須）
allowed_tools:
  - line.message.send
  - reservation.slot.list
credentials:
  line: vault://sample-salon/line   # auth-vault 参照。平文禁止
confirm_policy:
  destructive: dry_run_first        # 破壊的ツールは dry_run → confirm の2段階
audit: true                         # 全呼び出しを監査ログへ
```

- **allowed_tools 以外は tools/list にも現れない**（存在ごと隠す）。
- destructive: true のツールは `dry_run` 引数を強制。エージェントの誤操作対策であり、営業上の差別化要素でもある。
- 監査ログ: `{ts, customer, trace_id, tool, args_digest, result, latency}` を顧客別に保存。「AIに何をさせたか」を顧客に提示できる。

---

## 6. 調査可能性（トラブル対応の設計）

### 6.1 trace_id の貫通
入口（MCP/REST）で trace_id を発行し、router → connector → 外部API呼び出しまで全ログに付与。ログは JSONL 構造化ログ1本に統一:
```json
{"ts":"...","trace_id":"tr_abc","customer":"sample-salon","tool":"line.message.send","phase":"external_call","latency_ms":420,"error_code":null}
```

### 6.2 フライトレコーダ
- コネクタごとに直近N件のリクエスト/レスポンスを（秘匿情報をマスクして）リングバッファ保存。
- **失敗した呼び出しは自動で fixture 形式にエクスポート** → そのまま単体テストの再現ケースになる。本番障害が翌日のテスト資産に変わるループ。

### 6.3 エラー分類（taxonomy）
外部APIの雑多なエラーを必ず正規化してから返す:
`AUTH_EXPIRED / RATE_LIMITED / INVALID_INPUT / UPSTREAM_DOWN / NOT_ALLOWED / UNKNOWN`
各エラーに `{code, retriable, hint}` を付与。hint は「人とAIが次に何を調べるべきか」を書く（例: "LINEチャネルトークンの期限切れ。vault://.../line を更新"）。

### 6.4 自己診断もMCPツールにする
ハブ自身のデバッグ用ツールを管理者スコープで公開する。**Claude Code や Hermes Agent が、ハブに聞くだけで障害調査できる**状態にする。
| ツール | 内容 |
|---|---|
| musubi.health | 全コネクタの healthCheck 一括実行 |
| musubi.errors.recent | 直近エラー一覧（error_code別集計つき） |
| musubi.trace.get | trace_id 指定で該当リクエストの全ログ取得 |
| musubi.replay | フライトレコーダの記録をdry-runで再実行 |
| musubi.connector.smoke | 指定コネクタの実API疎通テスト |

### 6.5 障害の隔離
- コネクタは lazy-load ＋ エラーバウンダリで包む。例外は必ず taxonomy に変換され、プロセスを落とさない。
- 連続失敗したコネクタはサーキットブレーカで degraded 扱いにし、tools/list 上で明示。他コネクタは通常運転を続ける。

---

## 7. テスト戦略（v1 の3層を維持し1層追加）

| 層 | 内容 | 実行 |
|---|---|---|
| 共通コントラクト | 全コネクタ同一スイート（ports準拠・manifest妥当性・エラー分類準拠） | CI |
| 単体（fixture） | 記録済みレスポンス。**フライトレコーダからの自動エクスポート分を含む** | CI |
| Smoke | 実API疎通。`npm run smoke -- line` | 手動/デプロイ後 |
| MCP E2E | MCPクライアントとして tools/list → 呼び出し → 監査ログ確認まで。Cowork in Chrome で実行 | ループ内 |

---

## 8. AI実装ガードレール（CLAUDE.md の骨子）

実装をOpus/Sonnetに委任する前提で、規約を構造で強制する。

1. **依存方向の強制**: connectors → core(ports/domain) のみ許可。connector間import・interfaces→connector直接参照は eslint（boundaries系ルール）でエラーにする。
2. **コア凍結**: 通常のコネクタ追加PRで core/ に差分が出たらCIで落とす（コア変更は明示ラベルのあるPRのみ許可）。
3. **スキャフォールド必須**: 新コネクタは `npm run new-connector <name>` から開始。手作りフォルダ禁止。雛形にはテスト・manifest・エラー分類の対応表が含まれる。
4. **境界のzod検証必須**: 入口・コネクタ入出力・外部API応答の3点で必ず parse。奥で壊れる前に境界で落とす。
5. **1ファイル1責務・小さく**: 目安200行超で分割。AIが差分を安全に当てられる粒度を保つ。
6. **ログ規約**: console.log 禁止。telemetry ロガー経由のみ（lintで強制）。
7. **完成の定義**: 4層テストグリーン ＋ musubi.health で healthy ＋ docs 再生成に反映、の3点。

---

## 9. 開発ループ（v1 §9 を更新）

`/loop` カスタムコマンドで反復:
1. `git pull`
2. docs 自動生成（registry から）
3. BACKLOG.md 上位に着手（スキャフォールド起点）
4. コントラクト＋fixture テスト
5. デプロイ（Actions ビルド → VPS pull）
6. **MCP E2E**: Cowork in Chrome で「エージェントとしてハブを使う」シナリオを実行、`musubi.errors.recent` を確認して test-reports/ に保存
7. 失敗はフライトレコーダから fixture 化 → BACKLOG.md 起票 → 1 へ

---

## 10. リスクと対策（v2 追加分）

| リスク | 対策 |
|---|---|
| AI実装がコアを壊す | §8 のコア凍結CI・依存方向lint・スキャフォールド強制 |
| エージェントの誤操作（顧客業務への実害） | destructive フラグ＋dry_run 2段階＋顧客別 allowed_tools |
| 障害原因が追えない | trace_id 貫通・フライトレコーダ・musubi.trace.get |
| 1コネクタ障害の連鎖 | エラーバウンダリ＋サーキットブレーカで隔離 |
| 秘匿情報のログ流出 | フライトレコーダは保存前にマスク。監査ログは args_digest（ハッシュ）のみ |
| MCP仕様の変化 | interfaces/mcp に隔離。core は MCP を知らない構造のため差し替え可能 |

（v1 の Traefik・リソース・トークン管理のリスク対策は継続）

---

## 11. ロードマップ（v2）

| フェーズ | 内容 | 完了条件 |
|---|---|---|
| P1: 骨格 | registry / router / telemetry / MCPサーバー最小構成 / Traefik追加 | Claude から /mcp/admin に接続し musubi.health が返る |
| P2: LINE コネクタ | 既存知見を流用。4層テスト | エージェントから line.message.send が届く（dry_run→confirm含む） |
| P3: 調査基盤 | フライトレコーダ / エラー分類 / musubi.* 診断ツール / 監査ログ | 疑似障害を musubi.trace.get だけで原因特定できる |
| P4: ループ確立 | /loop・docs生成・Actionsデプロイ・fixture自動化 | 1周無人完走 |
| P5: 顧客スコープ | customers/ 方式で顧客専用MCPを発行 | config追加のみで新規顧客URL発行 |
| P6: 商品化 | 提案パッケージ（ツールカタログ＋監査ログ見本）、Hermes Agent を第一号ユーザーとして実績化 | 初回顧客デモ |
