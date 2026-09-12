# AGENTS.md — Codex（他コーディングエージェント）向け作業ガイド

このファイルは Claude Code 以外のコーディングエージェント（Codex 等、`AGENTS.md` 規約に
対応するツール全般）がこのリポジトリで直接作業するための入口。Claude Code は
`CLAUDE.md` を読むが、Codex は基本的にこちらを読む。

**役割分担の前提**: このプロジェクトのバックエンド/アーキテクチャ規約は `CLAUDE.md` に
集約されている。Codex には主に **`web/`（ダッシュボードSPA）のデザイン・LP（ランディング
ページ）・アイコン等の視覚面**を任せる想定。`core/` `connectors/` `interfaces/` に
手を入れる場合は、作業前に必ず `CLAUDE.md` を読むこと（依存方向・コア凍結などの
構造的な制約があり、違反すると `npm run lint` / `npm run check:boundaries` /
`npm run check:core-freeze` が落ちる）。

## 1. このリポジトリの全体像（デザイン作業に必要な最小限）

```
vaixio/
├── CLAUDE.md          # バックエンド/アーキテクチャの規約（Claude Code向け、Codexも
│                        core/connectors/interfacesに触るときは必読）
├── AGENTS.md          # このファイル
├── core/ connectors/ interfaces/   # バックエンド。§2により core/ は基本触らない
├── customers/         # 顧客ごとの設定（config.yaml）
├── web/               # ダッシュボードSPA。React + Vite + Tailwind v4。
│                        core/connectors/interfacesを一切importしない完全に独立した
│                        プロジェクト（独自のpackage.json/tsconfig/eslint設定を持つ）。
│                        ルートのeslint境界チェックも web/** を無視するので、
│                        ここでの作業はバックエンドの構造ルールの対象外＝自由度が高い。
└── (marketing/)       # LP（ランディングページ）置き場。現状は存在しない。
                          §3参照。新規作成時にCodexが作ってよい。
```

## 2. `web/`（ダッシュボードSPA）でのデザイン作業

### 起動・確認コマンド

```bash
cd web
npm run dev        # http://localhost:5173 (バックエンドAPIは /dashboard-api, /oauth を
                    # http://localhost:3000 にプロキシする。vite.config.ts参照。
                    # バックエンド自体はリポジトリルートで `npm run dev` して別途起動が必要)
npm test           # vitest
npm run lint       # oxlint
npx tsc --noEmit   # 型チェック
```

バックエンドが起動していなくても `npm run dev` でSPA自体の見た目は確認できる
（データ取得系のfetchは失敗するが、ログイン画面などの静的な見た目は確認可能）。
実際のログイン→ダッシュボード遷移まで通しで見たい場合は、リポジトリルートで
Postgres起動→`npm run db:migrate`→`npm run dev`（バックエンド）が必要
（詳細はCLAUDE.mdの§0, §11）。

### デザインシステム（唯一の情報源）

- **カラートークン・フォント**: [web/src/index.css](web/src/index.css) の `@theme` ブロック。
  `--color-brand-50` 〜 `--color-brand-950`（現行値: 600系が `#3e57e2`）。
  リブランド・配色調整はここを変更すれば全体に反映される。
- **ブランド名/タグライン**: [web/src/config/brand.ts](web/src/config/brand.ts) が唯一の情報源。
  ヘッダー/タイトル等はすべてここからimportしている。
- **共通UIコンポーネント**（新しい画面もまずここにあるもので組み立てる）:
  [web/src/components/ui/](web/src/components/ui/)
  `Button.tsx`（variant: primary/secondary/ghost） `Card.tsx` `Badge.tsx`
  `EmptyState.tsx` `Field.tsx` `Spinner.tsx` `Alert.tsx`
- **プラットフォームアイコン**（LINE/Instagram/Facebook/Google等の配色ロゴ）:
  [web/src/components/connections/platform-icons.tsx](web/src/components/connections/platform-icons.tsx)。
  新しい連携先アイコンを追加する時はこのファイルに追記し、
  `ConnectionCard.tsx` の `PLATFORM_ICONS` / `PLATFORM_LABELS` にも登録する。
- **連携ボタンの実装例**: `InstagramConnectLink.tsx` / `FacebookPageConnectLink.tsx` /
  `GoogleBusinessProfileConnectLink.tsx`。新しい連携先を増やす時のテンプレートとして
  このパターン（`/oauth/<platform>/start?customer=<slug>` への素のリンク、fetchやSPA
  ルーティングを介さない）を踏襲する。バックエンド側のOAuthルート自体は
  `interfaces/oauth/*-connect.ts`（Codexが触る場合もCLAUDE.md §8.1の依存方向は守ること）。
- **レイアウト**: `web/src/components/layout/{TopBar,DashboardLayout,AuthLayout}.tsx`。

### 触ってよい範囲 / 触る前に一声ほしい範囲

- **自由に変更してよい**: `web/src/components/ui/*` の見た目、`web/src/index.css` の
  トークン、`web/src/components/connections/*` の見た目・アイコン、静的な文言・配色・
  余白・アニメーション全般。
- **変更前に意図を確認した方がよい**: `web/src/api/*`（バックエンドとの契約）、
  `web/src/auth/*`（認証ロジック）、`web/src/App.tsx` のルーティング構造（見た目でなく
  機能に関わるため）。

### テスト

見た目だけの変更でも、既存のfixtureテスト（`*.test.tsx`）が文言・role名を
アサートしていることがある（例: `ConnectionsList.test.tsx` がボタンの
`getByRole("link", { name: "..." })` を見ている）。テキストラベルを変える時は
対応するテストも一緒に更新すること。

## 3. LP（ランディングページ）について

現状、本番用のLPはこのリポジトリ内にまだ存在しない。参考として、Claude Design
（Claude Codeの提案）で作成したドラフトが以下にある（内容・トーンの参考用。
実装はここに縛られなくてよい）:

- ダーク基調・グロー効果・グラスモーフィズムの近未来的トーン
- 構成: ヒーロー→課題提起→使い方3ステップ（連携する/AIエージェントに指示する/
  実行履歴で確認する）→できることグリッド→安心・安全セクション→対象事業者→
  最終CTA→フッター（Digitarod運営表記）
- 参照した実際の製品仕様: `specs/` 配下の各コネクタspec、
  `architechure/vaixio-architecture-v2.2.md` の商品ポジショニング（§1.1〜1.3）

### 実装場所の方針

LPは**ダッシュボードSPA（`web/`）とは別**に置くことを推奨する。理由:
- LPは未認証・公開ページで、SEOやマーケ用の別ドメイン/サブドメイン配信も
  将来ありうる（`web/`は認証必須のダッシュボード専用）。
- `web/`のルーティング（`App.tsx`）に混ぜると、認証まわりの分岐が複雑になる。

新規に `marketing/`（または任意の名前）ディレクトリを作り、`web/`と同様に
**`core/` `connectors/` `interfaces/` を一切importしない独立した静的サイト**として
実装すること（Reactでも素のHTML/CSSでも良い。技術選定はCodexの判断に委ねる）。
実データ・バックエンド呼び出しは不要な静的ページとして作ってよい
（問い合わせフォーム等、実際に送信が必要な機能を作る場合のみ、
`interfaces/`側の窓口が必要にならないか事前に相談すること）。

配色・フォントは `web/src/index.css` のトークンを起点にしつつ、マーケティング用途
としてより大胆な配色・演出（グラデーション、アニメーション等）に振るのは問題ない
（実際のダッシュボードUIより装飾的でよい）。

## 4. コミット・実行に関する注意

- `git commit` はユーザーから明示的に依頼された時のみ行う。
- 破壊的なコマンド（`git reset --hard`, `rm -rf` 等）は使わない。
- ローカル動作確認用の一時プロセス（`npm run dev`等）は、確認後に必要に応じて
  停止する。ポートが使用中の場合は `lsof -ti:<port> -sTCP:LISTEN | xargs -r kill`
  で既存プロセスを終了してから再起動する。
- `.env` には実際の認証情報（LINEチャネルアクセストークン、Google/Facebook等の
  OAuthクライアントシークレット）が入っている。gitignore対象だが、内容を
  ログや外部に出力しないこと。
