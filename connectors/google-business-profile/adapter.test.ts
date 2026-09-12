import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tokenStore from "../../core/auth-vault/token-store.js";
import adapter from "./adapter.js";

const ctx = { traceId: "tr_test", customer: "test-customer", dryRun: false };

const connectedToken = {
  platform: "google_business_profile",
  customer: "test-customer",
  accessToken: "live-access-token",
  refreshToken: "live-refresh-token",
  accountId: "123",
  accountName: "サンプルサロン",
  obtainedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

describe("google-business-profile adapter (fixture)", () => {
  beforeEach(() => {
    process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID = "dummy-client-id";
    process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET = "dummy-client-secret";
    process.env.VAIXIO_PUBLIC_BASE_URL = "https://mcp.example.com";
    process.env.OAUTH_STATE_SECRET = "state_secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID;
    delete process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET;
    delete process.env.VAIXIO_PUBLIC_BASE_URL;
    delete process.env.OAUTH_STATE_SECRET;
  });

  it("reports healthy on healthCheck when env vars are set", async () => {
    const result = await adapter.healthCheck();
    expect(result).toEqual({ platform: "google_business_profile", healthy: true });
  });

  it("reports unhealthy when required env vars are missing", async () => {
    delete process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID;
    const result = await adapter.healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.detail).toContain("GOOGLE_BUSINESS_PROFILE_CLIENT_ID");
  });

  it("returns NOT_ALLOWED for an unknown tool", async () => {
    const result = await adapter.invoke("google_business_profile.does.not.exist", {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_ALLOWED");
  });

  it("returns AUTH_EXPIRED when the customer has not connected an account", async () => {
    vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(undefined);
    const result = await adapter.invoke("google_business_profile.location.list", {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AUTH_EXPIRED");
      expect(result.error.hint).toContain("/oauth/google-business-profile/start?customer=test-customer");
    }
  });

  describe("google_business_profile.location.list", () => {
    it("flattens accounts x locations into a single list", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("mybusinessaccountmanagement")) {
          return jsonResponse(200, { accounts: [{ name: "accounts/123", accountName: "サンプルサロン" }] });
        }
        return jsonResponse(200, {
          locations: [{ name: "locations/456", title: "本店", storefrontAddress: { addressLines: ["東京都渋谷区1-1"] } }],
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await adapter.invoke("google_business_profile.location.list", {}, ctx);
      expect(result).toEqual({
        ok: true,
        data: { locations: [{ accountId: "123", locationId: "456", name: "本店", address: "東京都渋谷区1-1" }] },
      });
    });

    it("refreshes the access token when it is close to expiry before calling the API", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue({
        ...connectedToken,
        accessToken: "stale-token",
        expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
      });
      const saveSpy = vi.spyOn(tokenStore, "saveOAuthToken").mockResolvedValue(undefined);
      const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url === "https://oauth2.googleapis.com/token") {
          return jsonResponse(200, { access_token: "fresh-token", expires_in: 3600 });
        }
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer fresh-token");
        if (url.includes("mybusinessaccountmanagement")) return jsonResponse(200, { accounts: [] });
        return jsonResponse(200, { locations: [] });
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await adapter.invoke("google_business_profile.location.list", {}, ctx);
      expect(result).toEqual({ ok: true, data: { locations: [] } });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({ method: "POST" }),
      );
      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "fresh-token" }));
    });
  });

  describe("google_business_profile.review.list", () => {
    it("normalizes reviews from the legacy v4 API", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            reviews: [
              {
                reviewId: "r1",
                reviewer: { displayName: "山田太郎" },
                starRating: "FIVE",
                comment: "とても良かったです",
                createTime: "2026-01-01T00:00:00Z",
              },
            ],
            averageRating: 4.5,
            totalReviewCount: 10,
          }),
        ),
      );

      const result = await adapter.invoke(
        "google_business_profile.review.list",
        { accountId: "123", locationId: "456" },
        ctx,
      );
      expect(result).toEqual({
        ok: true,
        data: {
          reviews: [
            {
              reviewId: "r1",
              reviewerName: "山田太郎",
              starRating: "FIVE",
              comment: "とても良かったです",
              createTime: "2026-01-01T00:00:00Z",
              reply: undefined,
            },
          ],
          averageRating: 4.5,
          totalReviewCount: 10,
        },
      });
    });
  });

  describe("google_business_profile.review.reply", () => {
    it("dry_run: does not call the API and returns a preview", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const result = await adapter.invoke(
        "google_business_profile.review.reply",
        { accountId: "123", locationId: "456", reviewId: "r1", comment: "ご来店ありがとうございました" },
        { ...ctx, dryRun: true },
      );
      expect(result).toEqual({
        ok: true,
        data: { dry_run: true, would_reply: { reviewId: "r1", comment: "ご来店ありがとうございました" } },
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("PUTs the reply and reports success", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(200, { comment: "ご来店ありがとうございました", updateTime: "2026-01-02T00:00:00Z" }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await adapter.invoke(
        "google_business_profile.review.reply",
        { accountId: "123", locationId: "456", reviewId: "r1", comment: "ご来店ありがとうございました" },
        ctx,
      );
      expect(result).toEqual({
        ok: true,
        data: { replied: true, comment: "ご来店ありがとうございました", updateTime: "2026-01-02T00:00:00Z" },
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews/r1/reply");
      expect(options.method).toBe("PUT");
      expect(JSON.parse(options.body)).toEqual({ comment: "ご来店ありがとうございました" });
    });

    it("throws (for router taxonomy classification) when the API returns an error", async () => {
      vi.spyOn(tokenStore, "getOAuthToken").mockResolvedValue(connectedToken);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(429, { message: "rate limited" })));

      await expect(
        adapter.invoke(
          "google_business_profile.review.reply",
          { accountId: "123", locationId: "456", reviewId: "r1", comment: "hi" },
          ctx,
        ),
      ).rejects.toMatchObject({ status: 429 });
    });
  });
});
