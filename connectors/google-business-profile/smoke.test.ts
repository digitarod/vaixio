import { describe, expect, it } from "vitest";
import adapter from "./adapter.js";

/**
 * §7 Smoke: 実API疎通。`npm run smoke -- google-business-profile` で単体指名実行する。
 * 通常の CI(fixtureテスト)では実行しない。RUN_SMOKE=1 のときのみ有効化する。
 *
 * OAuthで実際に連携済みの顧客が必要（GBP_SMOKE_CUSTOMER）。事前に
 * `/oauth/google-business-profile/start?customer=<name>` で連携を済ませておくこと。
 * 例: GBP_SMOKE_CUSTOMER=sample-salon RUN_SMOKE=1 npm run smoke -- google-business-profile
 */
const runSmoke = process.env.RUN_SMOKE === "1" ? describe : describe.skip;

runSmoke("google-business-profile adapter (smoke)", () => {
  it("healthCheck reports the connector's own env var readiness", async () => {
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(true);
  });

  const customer = process.env.GBP_SMOKE_CUSTOMER;
  const runLocationSmoke = customer ? it : it.skip;

  runLocationSmoke("google_business_profile.location.list reaches the real API", async () => {
    const result = await adapter.invoke(
      "google_business_profile.location.list",
      {},
      { traceId: "tr_smoke", customer: customer!, dryRun: false },
    );
    expect(result.ok).toBe(true);
  });
});
