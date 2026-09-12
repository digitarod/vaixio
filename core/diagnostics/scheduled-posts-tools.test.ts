import { afterEach, describe, expect, it, vi } from "vitest";
import * as customersRepo from "../db/repositories/customers.js";
import * as scheduledPostsRepo from "../db/repositories/scheduled-posts.js";
import type { LoadedConnector } from "../registry/index.js";
import { buildDiagnosticTools } from "./tools.js";

const connectors = [
  {
    platform: "instagram",
    manifest: {
      platform: "instagram",
      version: "0.1.0",
      auth: { type: "oauth2_instagram_login" },
      tools: [{ name: "instagram.post.create", description: "", destructive: true, inputSchema: {} }],
    },
    instance: { invoke: vi.fn(), healthCheck: vi.fn() },
  },
] as unknown as LoadedConnector[];

const ctx = { traceId: "tr_test", customer: "test-customer", dryRun: false };

function findTool(name: string) {
  const tools = buildDiagnosticTools({ connectors, invoke: vi.fn() });
  const entry = tools.find((t) => t.definition.name === name);
  if (!entry) throw new Error(`tool not found: ${name}`);
  return entry;
}

describe("scheduled-posts diagnostic tools", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("vaixio.post.schedule", () => {
    it("dry_run: previews without touching the DB", async () => {
      const spy = vi.spyOn(customersRepo, "findCustomerBySlug");
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const result = await findTool("vaixio.post.schedule").invoke(
        { tool_name: "instagram.post.create", args: { caption: "hi" }, scheduled_at: future, dry_run: true },
        ctx,
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toMatchObject({ dry_run: true });
      expect(spy).not.toHaveBeenCalled();
    });

    it("rejects an unknown tool name", async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await findTool("vaixio.post.schedule").invoke(
        { tool_name: "does.not.exist", args: {}, scheduled_at: future },
        ctx,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_INPUT");
    });

    it("rejects scheduling a vaixio.* meta tool", async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await findTool("vaixio.post.schedule").invoke(
        { tool_name: "vaixio.health", args: {}, scheduled_at: future },
        ctx,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_INPUT");
    });

    it("rejects a scheduled_at that is in the past", async () => {
      const past = new Date(Date.now() - 60 * 1000).toISOString();
      const result = await findTool("vaixio.post.schedule").invoke(
        { tool_name: "instagram.post.create", args: {}, scheduled_at: past },
        ctx,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_INPUT");
    });

    it("persists via the repository when not dry_run", async () => {
      vi.spyOn(customersRepo, "findCustomerBySlug").mockResolvedValue({ id: "cust-1", slug: "test-customer", displayName: null });
      const createSpy = vi
        .spyOn(scheduledPostsRepo, "createScheduledPost")
        .mockResolvedValue(
          { id: "sp-1", toolName: "instagram.post.create", scheduledAt: new Date(), status: "pending" } as Awaited<
            ReturnType<typeof scheduledPostsRepo.createScheduledPost>
          >,
        );

      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await findTool("vaixio.post.schedule").invoke(
        { tool_name: "instagram.post.create", args: { caption: "hi" }, scheduled_at: future },
        ctx,
      );
      expect(result.ok).toBe(true);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: "cust-1", toolName: "instagram.post.create" }),
      );
    });

    it("returns UPSTREAM_DOWN when the DB is unreachable/unset", async () => {
      vi.spyOn(customersRepo, "findCustomerBySlug").mockRejectedValue(new Error("DATABASE_URL が未設定です"));
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await findTool("vaixio.post.schedule").invoke(
        { tool_name: "instagram.post.create", args: {}, scheduled_at: future },
        ctx,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("UPSTREAM_DOWN");
    });
  });

  describe("vaixio.post.schedule.list", () => {
    it("returns the customer's scheduled posts", async () => {
      vi.spyOn(customersRepo, "findCustomerBySlug").mockResolvedValue({ id: "cust-1", slug: "test-customer", displayName: null });
      vi.spyOn(scheduledPostsRepo, "listScheduledPostsForCustomer").mockResolvedValue([
        {
          id: "sp-1",
          toolName: "line.message.send",
          args: { to: "U1", message: "hi" },
          scheduledAt: new Date("2027-01-01T00:00:00Z"),
          status: "pending",
          publishedAt: null,
          errorMessage: null,
        },
      ] as Awaited<ReturnType<typeof scheduledPostsRepo.listScheduledPostsForCustomer>>);

      const result = await findTool("vaixio.post.schedule.list").invoke({}, ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.data as { scheduled_posts: { tool_name: string }[] };
        expect(data.scheduled_posts).toHaveLength(1);
        expect(data.scheduled_posts[0].tool_name).toBe("line.message.send");
      }
    });
  });

  describe("vaixio.post.schedule.cancel", () => {
    it("cancels a pending post owned by the calling customer", async () => {
      vi.spyOn(customersRepo, "findCustomerBySlug").mockResolvedValue({ id: "cust-1", slug: "test-customer", displayName: null });
      vi.spyOn(scheduledPostsRepo, "cancelScheduledPost").mockResolvedValue(true);

      const result = await findTool("vaixio.post.schedule.cancel").invoke({ id: "sp-1" }, ctx);
      expect(result).toEqual({ ok: true, data: { cancelled: true, id: "sp-1" } });
    });

    it("returns INVALID_INPUT when nothing cancellable is found", async () => {
      vi.spyOn(customersRepo, "findCustomerBySlug").mockResolvedValue({ id: "cust-1", slug: "test-customer", displayName: null });
      vi.spyOn(scheduledPostsRepo, "cancelScheduledPost").mockResolvedValue(false);

      const result = await findTool("vaixio.post.schedule.cancel").invoke({ id: "sp-missing" }, ctx);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_INPUT");
    });
  });
});
