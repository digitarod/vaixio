import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import adapter from "./adapter.js";

const ctx = { traceId: "tr_test", customer: "test", dryRun: false };
const validArgs = {
  account_id: "ig_12345",
  caption: "テスト投稿",
  media: [{ url: "https://cdn.example.com/photo.jpg", type: "image" as const }],
};

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe("instagram adapter (fixture)", () => {
  beforeEach(() => {
    process.env.VAULT__INSTAGRAM__API_KEY = "sk_test_dummy";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VAULT__INSTAGRAM__API_KEY;
  });

  it("reports healthy when Zernio responds ok", async () => {
    mockFetchOnce(200, { data: [] });
    const result = await adapter.healthCheck();
    expect(result).toEqual({ platform: "instagram", healthy: true, detail: undefined });
  });

  it("reports unhealthy when Zernio responds with an error status", async () => {
    mockFetchOnce(401, { message: "invalid key" });
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(false);
  });

  it("dry_run: does not call Zernio and returns a preview", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await adapter.invoke("instagram.post.create", validArgs, { ...ctx, dryRun: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({ dry_run: true });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to Zernio and normalizes the response", async () => {
    mockFetchOnce(200, { id: "post_abc", status: "scheduled" });
    const result = await adapter.invoke("instagram.post.create", validArgs, ctx);
    expect(result).toEqual({ ok: true, data: { post_id: "post_abc", status: "scheduled" } });
  });

  it("throws (for router taxonomy classification) when Zernio returns an error status", async () => {
    mockFetchOnce(429, { message: "rate limited" });
    await expect(adapter.invoke("instagram.post.create", validArgs, ctx)).rejects.toMatchObject({ status: 429 });
  });

  it("returns NOT_ALLOWED for an unknown tool", async () => {
    const result = await adapter.invoke("instagram.does.not.exist", {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });
});
