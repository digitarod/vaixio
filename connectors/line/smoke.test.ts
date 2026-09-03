import { describe, expect, it } from "vitest";
import adapter from "./adapter.js";

/**
 * §7 Smoke: 実API疎通。`npm run smoke -- line` で単体指名実行する。
 * 通常の CI(fixtureテスト)では実行しない。RUN_SMOKE=1 のときのみ有効化する。
 *
 * LINEはコネクタ単位の資格情報を持たない(顧客ごとのチャネルトークン、
 * specs/line-connector.md参照)ため、実疎通確認には対象の顧客名と実在するuserIdが要る。
 * 例: LINE_SMOKE_CUSTOMER=sample-salon LINE_SMOKE_USER_ID=U... RUN_SMOKE=1 npm run smoke -- line
 */
const runSmoke = process.env.RUN_SMOKE === "1" ? describe : describe.skip;

runSmoke("line adapter (smoke)", () => {
  it("healthCheck resolves (資格情報が顧客ごとのため疎通確認はしない)", async () => {
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(true);
  });

  const customer = process.env.LINE_SMOKE_CUSTOMER;
  const userId = process.env.LINE_SMOKE_USER_ID;
  const runProfileSmoke = customer && userId ? it : it.skip;

  runProfileSmoke("line.profile.get reaches the real API", async () => {
    const result = await adapter.invoke(
      "line.profile.get",
      { userId },
      { traceId: "tr_smoke", customer: customer!, dryRun: false },
    );
    expect(result.ok).toBe(true);
  });
});
