import { afterEach, describe, expect, it, vi } from "vitest";
import * as tokenStore from "../../core/auth-vault/token-store.js";
import { startInstagramTokenRefreshJob } from "./instagram-refresh-job.js";

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

function tokenExpiringIn(days: number) {
  return {
    platform: "instagram",
    customer: "digitarod",
    accessToken: "old_token",
    accountId: "ig_1",
    accountName: "digitarod",
    obtainedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe("startInstagramTokenRefreshJob", () => {
  let timer: NodeJS.Timeout;

  afterEach(() => {
    clearInterval(timer);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refreshes a token that expires within the 7-day window", async () => {
    vi.spyOn(tokenStore, "listOAuthTokens").mockResolvedValue([tokenExpiringIn(3)]);
    const saveSpy = vi.spyOn(tokenStore, "saveOAuthToken").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { access_token: "new_token", expires_in: 5183944 })));

    timer = startInstagramTokenRefreshJob();
    await vi.waitFor(() => expect(saveSpy).toHaveBeenCalled());

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "new_token", customer: "digitarod" }));
  });

  it("does not refresh a token that is not close to expiring", async () => {
    vi.spyOn(tokenStore, "listOAuthTokens").mockResolvedValue([tokenExpiringIn(30)]);
    const saveSpy = vi.spyOn(tokenStore, "saveOAuthToken").mockResolvedValue(undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    timer = startInstagramTokenRefreshJob();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("logs and continues when the refresh call fails", async () => {
    vi.spyOn(tokenStore, "listOAuthTokens").mockResolvedValue([tokenExpiringIn(1)]);
    const saveSpy = vi.spyOn(tokenStore, "saveOAuthToken").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400, { error: "token too new to refresh" })));

    timer = startInstagramTokenRefreshJob();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(saveSpy).not.toHaveBeenCalled();
  });
});
