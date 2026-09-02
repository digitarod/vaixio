import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../client.js";
import { findCustomerBySlug, upsertCustomer } from "./customers.js";

/**
 * 実DB(DATABASE_URL)に対する統合テスト。CIではpostgresサービスコンテナに対して実行する。
 * DATABASE_URLが無い環境ではスキップする(ローカルでDB無しにも npm test が通るように)。
 */
const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("customers repository", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("creates a customer on first upsert and returns it", async () => {
    const slug = `test-${Date.now()}-a`;
    const created = await upsertCustomer(slug, "Test Salon A");
    expect(created.slug).toBe(slug);
    expect(created.displayName).toBe("Test Salon A");

    const found = await findCustomerBySlug(slug);
    expect(found?.id).toBe(created.id);
  });

  it("updates displayName on repeated upsert for the same slug (idempotent)", async () => {
    const slug = `test-${Date.now()}-b`;
    const first = await upsertCustomer(slug, "Old Name");
    const second = await upsertCustomer(slug, "New Name");

    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe("New Name");
  });

  it("returns undefined for an unknown slug", async () => {
    expect(await findCustomerBySlug("no-such-customer-slug")).toBeUndefined();
  });
});
