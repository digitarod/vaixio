import { defineConfig } from "@playwright/test";

/**
 * §7拡張: ブラウザ経由の実結合テスト。ユニット/統合テストでは検出できなかった
 * 「一度もMCP/REST経由で呼ばれたことのない顧客がダッシュボード新規登録できない」
 * バグ(実機で発見)を踏まえて追加。Tester役が日次でこれを回す(agents/tester-prompt.md)。
 *
 * webServer が `npm start` を自動起動する。事前に以下が必要:
 *   - DATABASE_URL がマイグレーション済みのPostgresを指していること
 *   - `cd web && npm run build` 済みであること(web/distが無いとSPAが配信されない)
 */
const PORT = Number(process.env.E2E_PORT ?? 3500);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm start",
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      PORT: String(PORT),
      MUSUBI_HOST: "127.0.0.1",
      // ローカルの.envにMUSUBI_ALLOWED_HOSTSが残っていると127.0.0.1への接続が403になる事故が
      // 実際に起きたため、E2E実行時は明示的に空にして常にlocalhostのデフォルト許可を使う。
      MUSUBI_ALLOWED_HOSTS: "",
    },
  },
});
