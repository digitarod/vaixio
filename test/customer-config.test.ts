import { describe, expect, it } from "vitest";
import { loadCustomerConfig } from "../core/registry/customer-config.js";

describe("customers/admin/config.yaml", () => {
  it("parses as a valid CustomerConfig and exposes the diagnostic tools", async () => {
    const config = await loadCustomerConfig("admin");
    expect(config).toBeDefined();
    expect(config?.mcp_path).toBe("/mcp/admin");
    expect(config?.allowed_tools).toContain("musubi.health");
  });

  it("returns undefined for an unknown customer (§5: 存在ごと隠す)", async () => {
    const config = await loadCustomerConfig("no-such-customer");
    expect(config).toBeUndefined();
  });
});
