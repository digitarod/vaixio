import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import adapter from "./adapter.js";

const ctx = { traceId: "tr_test", customer: "test-customer", dryRun: false };

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("line adapter (fixture)", () => {
  beforeEach(() => {
    process.env.VAULT__TEST_CUSTOMER__LINE = "dummy-channel-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VAULT__TEST_CUSTOMER__LINE;
  });

  it("reports healthy on healthCheck", async () => {
    const result = await adapter.healthCheck();
    expect(result).toEqual({ platform: "line", healthy: true });
  });

  it("returns NOT_ALLOWED for an unknown tool", async () => {
    const result = await adapter.invoke("line.does.not.exist", {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });

  describe("line.message.send", () => {
    it("dry_run: does not call the LINE API and returns a preview", async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const result = await adapter.invoke("line.message.send", { to: "U123", message: "hello" }, { ...ctx, dryRun: true });
      expect(result).toEqual({ ok: true, data: { dry_run: true, would_send: { to: "U123", message: "hello" } } });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("pushes a text message and reports delivery", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
      vi.stubGlobal("fetch", fetchMock);

      const result = await adapter.invoke("line.message.send", { to: "U123", message: "hello" }, ctx);
      expect(result).toEqual({ ok: true, data: { delivered: true } });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.line.me/v2/bot/message/push");
      expect(options.headers.Authorization).toBe("Bearer dummy-channel-token");
      expect(JSON.parse(options.body)).toEqual({
        to: "U123",
        messages: [{ type: "text", text: "hello" }],
      });
    });

    it("throws (for router taxonomy classification) when LINE returns an error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(429, { message: "rate limited" })));

      await expect(adapter.invoke("line.message.send", { to: "U123", message: "hi" }, ctx)).rejects.toMatchObject({
        status: 429,
      });
    });
  });

  describe("line.profile.get", () => {
    it("returns the normalized profile", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(200, { displayName: "Taro", userId: "U123", pictureUrl: "https://x/y.jpg" })),
      );

      const result = await adapter.invoke("line.profile.get", { userId: "U123" }, ctx);
      expect(result).toEqual({
        ok: true,
        data: { displayName: "Taro", userId: "U123", pictureUrl: "https://x/y.jpg" },
      });
    });

    it("returns INVALID_INPUT (not a thrown error) when LINE returns 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { message: "not found" })));

      const result = await adapter.invoke("line.profile.get", { userId: "Ughost" }, ctx);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_INPUT");
        expect(result.error.hint).toContain("ブロック解除");
      }
    });

    it("throws for other error statuses", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "invalid token" })));

      await expect(adapter.invoke("line.profile.get", { userId: "U123" }, ctx)).rejects.toMatchObject({ status: 401 });
    });
  });
});
