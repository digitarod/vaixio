import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../client.js";
import { upsertCustomer } from "./customers.js";
import {
  cancelScheduledPost,
  createScheduledPost,
  findDuePosts,
  listScheduledPostsForCustomer,
  markScheduledPostFailed,
  markScheduledPostPublished,
} from "./scheduled-posts.js";

const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("scheduled-posts repository", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("creates a scheduled post and lists it back for the customer", async () => {
    const customer = await upsertCustomer(`test-schedule-${Date.now()}`);
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);

    const created = await createScheduledPost({
      customerId: customer.id,
      toolName: "instagram.post.create",
      args: { caption: "hello", media: [{ url: "https://cdn.example.com/a.jpg", type: "image" }] },
      scheduledAt,
    });
    expect(created.status).toBe("pending");

    const listed = await listScheduledPostsForCustomer(customer.id);
    expect(listed).toHaveLength(1);
    expect(listed[0].toolName).toBe("instagram.post.create");
  });

  it("findDuePosts only returns pending posts whose scheduledAt has passed, with the customer slug joined in", async () => {
    const customer = await upsertCustomer(`test-schedule-due-${Date.now()}`);
    const past = new Date(Date.now() - 60 * 1000);
    const future = new Date(Date.now() + 60 * 60 * 1000);

    const due = await createScheduledPost({ customerId: customer.id, toolName: "line.message.send", args: { to: "U1", message: "hi" }, scheduledAt: past });
    await createScheduledPost({ customerId: customer.id, toolName: "line.message.send", args: { to: "U2", message: "later" }, scheduledAt: future });

    const results = await findDuePosts(new Date());
    const ids = results.map((r) => r.id);
    expect(ids).toContain(due.id);
    expect(results.find((r) => r.id === due.id)?.customerSlug).toBe(customer.slug);
  });

  it("markScheduledPostPublished / markScheduledPostFailed update status and are excluded from findDuePosts afterwards", async () => {
    const customer = await upsertCustomer(`test-schedule-status-${Date.now()}`);
    const past = new Date(Date.now() - 60 * 1000);

    const a = await createScheduledPost({ customerId: customer.id, toolName: "line.message.send", args: {}, scheduledAt: past });
    const b = await createScheduledPost({ customerId: customer.id, toolName: "line.message.send", args: {}, scheduledAt: past });

    await markScheduledPostPublished(a.id);
    await markScheduledPostFailed(b.id, "upstream error");

    const due = await findDuePosts(new Date());
    expect(due.map((r) => r.id)).not.toContain(a.id);
    expect(due.map((r) => r.id)).not.toContain(b.id);

    const listed = await listScheduledPostsForCustomer(customer.id);
    expect(listed.find((r) => r.id === a.id)?.status).toBe("published");
    expect(listed.find((r) => r.id === b.id)?.status).toBe("failed");
    expect(listed.find((r) => r.id === b.id)?.errorMessage).toBe("upstream error");
  });

  it("cancelScheduledPost only cancels a pending post owned by that customer, and is idempotent-safe against re-cancel", async () => {
    const customerA = await upsertCustomer(`test-schedule-cancel-a-${Date.now()}`);
    const customerB = await upsertCustomer(`test-schedule-cancel-b-${Date.now()}`);
    const future = new Date(Date.now() + 60 * 60 * 1000);

    const post = await createScheduledPost({ customerId: customerA.id, toolName: "line.message.send", args: {}, scheduledAt: future });

    expect(await cancelScheduledPost(post.id, customerB.id)).toBe(false);
    expect(await cancelScheduledPost(post.id, customerA.id)).toBe(true);
    expect(await cancelScheduledPost(post.id, customerA.id)).toBe(false); // 既にcancelled済みなので再キャンセルは不可
  });
});
