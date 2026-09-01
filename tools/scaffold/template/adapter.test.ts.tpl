import { describe, expect, it } from "vitest";
import adapter from "./adapter.js";

const ctx = { traceId: "tr_test", customer: "test", dryRun: true };

describe("__PLATFORM__ adapter (fixture)", () => {
  it("reports healthy on healthCheck", async () => {
    const result = await adapter.healthCheck();
    expect(result.platform).toBe("__PLATFORM__");
  });

  it("returns NOT_ALLOWED for an unknown tool", async () => {
    const result = await adapter.invoke("__PLATFORM__.does.not.exist", {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });

  it.todo("__PLATFORM__.example.action: 実装後にfixtureで正常系を検証する");
});
