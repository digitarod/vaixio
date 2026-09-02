import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../client.js";
import { upsertCustomer } from "./customers.js";
import { listAuditEventsForCustomer, recordAuditEvent } from "./audit.js";

const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("audit repository", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("records an event and lists it back, newest first", async () => {
    const customer = await upsertCustomer(`test-audit-${Date.now()}`);

    await recordAuditEvent({
      customerId: customer.id,
      toolName: "instagram.post.create",
      argsDigest: "digest1",
      result: "ok",
      dryRun: true,
      latencyMs: 42,
    });
    await recordAuditEvent({
      customerId: customer.id,
      toolName: "instagram.post.create",
      argsDigest: "digest2",
      result: "error",
      dryRun: false,
      latencyMs: 100,
    });

    const events = await listAuditEventsForCustomer(customer.id);
    expect(events).toHaveLength(2);
    expect(events[0].argsDigest).toBe("digest2"); // 新しい方が先頭
    expect(events[1].argsDigest).toBe("digest1");
  });

  it("returns an empty list for a customer with no events", async () => {
    const customer = await upsertCustomer(`test-audit-empty-${Date.now()}`);
    expect(await listAuditEventsForCustomer(customer.id)).toEqual([]);
  });
});
