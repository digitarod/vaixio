import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import adapter from "./adapter.js";
import * as tokenStore from "../../core/auth-vault/token-store.js";

const ctx = { traceId: "tr_test", customer: "test-customer", dryRun: false };
const validArgs = {
  caption: "テスト投稿",
  media: [{ url: "https://cdn.example.com/photo.jpg", type: "image" as const }],
};

const connectedToken = {
  platform: "instagram",
  customer: "test-customer",
  accessToken: "IGQtoken",
  accountId: "ig_999",
  accountName: "test_account",
  obtainedAt: new Date().toISOString(),
  expiresAt: null,
};

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("instagram adapter (fixture)", () => {
  beforeEach(() => {
    process.env.INSTAGRAM_APP_ID = "app_id";
    process.env.INSTAGRAM_APP_SECRET = "app_secret";
    process.env.VAIXIO_PUBLIC_BASE_URL = "https://mcp.example.com";
    process.env.OAUTH_STATE_SECRET = "state_secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.INSTAGRAM_APP_ID;
    delete process.env.INSTAGRAM_APP_SECRET;
    delete process.env.VAIXIO_PUBLIC_BASE_URL;
    delete process.env.OAUTH_STATE_SECRET;
  });

  it("reports healthy when required env vars are set", async () => {
    const result = await adapter.healthCheck();
    expect(result).toEqual({ platform: "instagram", healthy: true });
  });

  it("reports unhealthy when required env vars are missing", async () => {
    delete process.env.INSTAGRAM_APP_ID;
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.detail).toContain("INSTAGRAM_APP_ID");
  });

  it("returns AUTH_EXPIRED when the customer has not connected Instagram", async () => {
    vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(undefined);
    const result = await adapter.invoke("instagram.post.create", validArgs, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AUTH_EXPIRED");
      expect(result.error.hint).toContain("/oauth/instagram/start");
    }
  });

  it("dry_run: does not call Graph API and returns a preview", async () => {
    vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await adapter.invoke("instagram.post.create", validArgs, { ...ctx, dryRun: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ dry_run: true, account_id: "ig_999" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("creates a container, waits for it to finish, and publishes", async () => {
    vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { id: "container_1" })) // media container create
      .mockResolvedValueOnce(jsonResponse(200, { status_code: "FINISHED" })) // status poll
      .mockResolvedValueOnce(jsonResponse(200, { id: "media_1" })); // publish
    vi.stubGlobal("fetch", fetchMock);

    const result = await adapter.invoke("instagram.post.create", validArgs, ctx);
    expect(result).toEqual({ ok: true, data: { media_id: "media_1", account_id: "ig_999" } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws (for router taxonomy classification) when Graph API returns an error", async () => {
    vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400, { error: { message: "Invalid parameter" } })));

    await expect(adapter.invoke("instagram.post.create", validArgs, ctx)).rejects.toMatchObject({ status: 400 });
  });

  it("returns NOT_ALLOWED for an unknown tool", async () => {
    const result = await adapter.invoke("instagram.does.not.exist", {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });
});
