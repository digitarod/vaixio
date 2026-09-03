# 顧客セルフサービスダッシュボード（web/）

## 目的

顧客が自分でログインし、プラットフォーム連携（現状Instagramのみ）とAIエージェントの
利用履歴を確認できる画面。「次世代の高品質なサービス」という見た目の水準を狙う。

## 仕様

### 技術構成

- Vite + React + TypeScript の完全に独立したSPA（`core`/`connectors`/`interfaces`を
  一切importしない。バックエンドとは`/dashboard-api/*`・`/oauth/*`へのfetch/リンクのみ）。
- Tailwind CSS。ブランド名は未確定（`web/src/config/brand.ts`に集約、現状仮称"Corda"）。
- 本番はビルド済み`web/dist`をバックエンドのExpressプロセスが配信する（別プロセスを
  立てない。単一VPS構成を維持するため）。開発時はVite dev server が
  `/dashboard-api`・`/oauth`をバックエンド(:3000)にプロキシする。

### 画面・ルーティング

| パス | 内容 |
|---|---|
| `/login` | メール・パスワードでログイン。認証済みなら自動的に`/connections`へ |
| `/register` | お客様ID・メール・パスワード（確認あり）で新規登録。エラーは`errorMessages.ts`で日本語化 |
| `/connections` | 連携済みプラットフォーム一覧＋「Instagramを連携する」ボタン（既存の`/oauth/instagram/start?customer=<slug>`への通常リンク。SPA側でOAuthフローを再実装しない）。有効期限が近い/切れている連携は警告表示 |
| `/audit` | 直近の監査イベント一覧テーブル（成功=緑/失敗=赤、dry_runバッジ） |
| `*` | 404ページ |

認証ガードは`AuthContext`が`GET /dashboard-api/me`をアプリ起動時に一度だけ取得し、
未認証なら保護ルートから`/login`へリダイレクトする一元管理（各ページで個別に
チェックしない）。

### テスト

- Vitest + React Testing Library によるコンポーネントテスト（フォームのバリデーション、
  空/複数件/期限切れ間近の状態、認証ガードのリダイレクト等）。
- `e2e/dashboard.spec.ts`（Playwright、リポジトリルート）で実ブラウザによる
  登録→ログイン→連携ページ→ログアウトの結合テスト。「一度もMCP/RESTを呼ばれて
  いない顧客が登録できない」という実機で発見したバグの回帰テストを含む
  （詳細: `specs/database.md`, `CLAUDE.md` §14）。

## 既知の制約・スコープ外

- OAuth連携完了後のリダイレクト先UXの作り込み（連携直後に自動でconnectionsを
  再取得する等）は最小限。
- ダッシュボード上での顧客自身によるallowed_tools編集は無い（DBがRouter/Registryの
  真実の源ではないため。`specs/database.md`参照）。
- 多言語対応は無い（日本語UIのみ）。

## 関連ファイル

- `web/src/App.tsx`（ルート定義）
- `web/src/auth/AuthContext.tsx` / `ProtectedRoute.tsx`
- `web/src/components/{forms,connections,audit,layout,ui}/`
- `interfaces/mcp/mount-dashboard-web.ts`（本番の静的配信・SPAフォールバック）
