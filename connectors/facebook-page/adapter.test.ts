import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tokenStore from "../../core/auth-vault/token-store.js";
import adapter from "./adapter.js";

const ctx = { traceId: "tr_test", customer: "test-customer", dryRun: false };

const connectedToken = {
  platform: "facebook_page",
  customer: "test-customer",
  accessToken: "page-access-token",
  accountId: "page_123",
  accountName: "サンプルサロン公式ページ",
  obtainedAt: new Date().toISOString(),
  expiresAt: null,
};

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("facebook-page adapter (fixture)", () => {
  beforeEach(() => {
    process.env.FACEBOOK_APP_ID = "app_id";
    process.env.FACEBOOK_APP_SECRET = "app_secret";
    process.env.VAIXIO_PUBLIC_BASE_URL = "https://mcp.example.com";
    process.env.OAUTH_STATE_SECRET = "state_secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.VAIXIO_PUBLIC_BASE_URL;
    delete process.env.OAUTH_STATE_SECRET;
  });

  it("reports healthy when required env vars are set", async () => {
    const result = await adapter.healthCheck();
    expect(result).toEqual({ platform: "facebook_page", healthy: true });
  });

  it("reports unhealthy when required env vars are missing", async () => {
    delete process.env.FACEBOOK_APP_ID;
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.detail).toContain("FACEBOOK_APP_ID");
  });

  it("returns NOT_ALLOWED for an unknown tool", async () => {
    const result = await adapter.invoke("facebook_page.does.not.exist", {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });

  describe("facebook_page.post.create", () => {
    it("returns AUTH_EXPIRED when the customer has not connected a page", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(undefined);
      const result = await adapter.invoke("facebook_page.post.create", { message: "hello" }, ctx);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("AUTH_EXPIRED");
        expect(result.error.hint).toContain("/oauth/facebook-page/start?customer=test-customer");
      }
    });

    it("dry_run: does not call the Graph API and returns a preview", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const result = await adapter.invoke("facebook_page.post.create", { message: "こんにちは" }, { ...ctx, dryRun: true });
      expect(result).toEqual({
        ok: true,
        data: {
          dry_run: true,
          would_post_to: "サンプルサロン公式ページ",
          page_id: "page_123",
          message: "こんにちは",
          image_url: undefined,
          link: undefined,
        },
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("posts a text message to /feed when no image is given", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "post_abc" }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await adapter.invoke("facebook_page.post.create", { message: "こんにちは", link: "https://example.com" }, ctx);
      expect(result).toEqual({ ok: true, data: { post_id: "post_abc", page_id: "page_123" } });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://graph.facebook.com/v21.0/page_123/feed");
      const body = options.body as URLSearchParams;
      expect(body.get("message")).toBe("こんにちは");
      expect(body.get("link")).toBe("https://example.com");
      expect(body.get("access_token")).toBe("page-access-token");
    });

    it("posts to /photos when an image_url is given", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "photo_1", post_id: "post_xyz" }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await adapter.invoke(
        "facebook_page.post.create",
        { message: "写真です", image_url: "https://cdn.example.com/a.jpg" },
        ctx,
      );
      expect(result).toEqual({ ok: true, data: { post_id: "post_xyz", page_id: "page_123" } });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://graph.facebook.com/v21.0/page_123/photos");
      const body = options.body as URLSearchParams;
      expect(body.get("url")).toBe("https://cdn.example.com/a.jpg");
      expect(body.get("caption")).toBe("写真です");
    });

    it("throws (for router taxonomy classification) when the Graph API returns an error", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: { message: "invalid token" } })));

      await expect(adapter.invoke("facebook_page.post.create", { message: "hi" }, ctx)).rejects.toMatchObject({ status: 401 });
    });
  });
});
