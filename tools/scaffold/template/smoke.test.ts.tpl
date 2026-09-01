import { describe, expect, it } from "vitest";
import adapter from "./adapter.js";

/**
 * §7 Smoke: 実API疎通。`npm run smoke -- __PLATFORM__` で単体指名実行する。
 * 通常の CI(fixtureテスト)では実行しない。RUN_SMOKE=1 のときのみ有効化する。
 */
const runSmoke = process.env.RUN_SMOKE === "1" ? describe : describe.skip;

runSmoke("__PLATFORM__ adapter (smoke)", () => {
  it("healthCheck reaches the real API", async () => {
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(true);
  });
});
