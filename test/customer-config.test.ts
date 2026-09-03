import { describe, expect, it } from "vitest";
import { loadCustomerConfig, preloadAllCustomerConfigs } from "../core/registry/customer-config.js";
import { findCustomerBySlug } from "../core/db/repositories/customers.js";

describe("customers/admin/config.yaml", () => {
  it("parses as a valid CustomerConfig and exposes the diagnostic tools", async () => {
    const config = await loadCustomerConfig("admin");
    expect(config).toBeDefined();
    expect(config?.mcp_path).toBe("/mcp/admin");
    expect(config?.allowed_tools).toContain("vaixio.health");
  });

  it("returns undefined for an unknown customer (§5: 存在ごと隠す)", async () => {
    const config = await loadCustomerConfig("no-such-customer");
    expect(config).toBeUndefined();
  });
});

const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("preloadAllCustomerConfigs", () => {
  it("projects every customers/*/config.yaml into the DB without any prior MCP/REST call", async () => {
    // ダッシュボードの新規登録は、一度もMCP/REST経由で呼ばれたことのない顧客に対しては
    // 従来「DB未射影」で失敗していた(実機で発見)。起動時の先読みでこれを防ぐ。
    await preloadAllCustomerConfigs();
    expect(await findCustomerBySlug("admin")).toBeDefined();
    expect(await findCustomerBySlug("digitarod")).toBeDefined();
  });
});
