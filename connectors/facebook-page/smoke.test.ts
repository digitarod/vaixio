import { describe, expect, it } from "vitest";
import adapter from "./adapter.js";

/**
 * §7 Smoke: 実API疎通。`npm run smoke -- facebook-page` で単体指名実行する。
 * 通常の CI(fixtureテスト)では実行しない。RUN_SMOKE=1 のときのみ有効化する。
 */
const runSmoke = process.env.RUN_SMOKE === "1" ? describe : describe.skip;

runSmoke("facebook-page adapter (smoke)", () => {
  it("healthCheck reports the connector's own env var readiness", async () => {
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(true);
  });
});
