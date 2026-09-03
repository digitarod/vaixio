import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "../../core/db/client.js";
import { mountGoogleAuth } from "./google-auth.js";

const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("google-auth HTTP routing", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.VAIXIO_PUBLIC_BASE_URL = "https://dashboard.example.com";
    process.env.OAUTH_STATE_SECRET = "test-state-secret";

    const app = express();
    app.use(express.json());
    mountGoogleAuth(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    if (address && typeof address === "object") baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeDb();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.VAIXIO_PUBLIC_BASE_URL;
    delete process.env.OAUTH_STATE_SECRET;
  });

  it("redirects to Google's authorize endpoint with the correct client id, scope, and callback", async () => {
    const res = await fetch(`${baseUrl}/dashboard-api/auth/google/start?customer_slug=acme-corp`, {
      redirect: "manual",
    });
    expect(res.status).toBe(302);

    const location = new URL(res.headers.get("location")!);
    expect(location.origin + location.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(location.searchParams.get("scope")).toBe("openid email profile");
    expect(location.searchParams.get("redirect_uri")).toBe("https://dashboard.example.com/dashboard-api/auth/google/callback");
    expect(location.searchParams.get("state")).toBeTruthy();
  });

  it("rejects the callback when state is missing or forged", async () => {
    const noState = await fetch(`${baseUrl}/dashboard-api/auth/google/callback?code=abc`, { redirect: "manual" });
    expect(noState.status).toBe(400);

    const forged = await fetch(`${baseUrl}/dashboard-api/auth/google/callback?code=abc&state=forged.123.xxx`, {
      redirect: "manual",
    });
    expect(forged.status).toBe(400);
  });

  it("surfaces Google's own denial (error query param) as a 400", async () => {
    const res = await fetch(`${baseUrl}/dashboard-api/auth/google/callback?error=access_denied`, { redirect: "manual" });
    expect(res.status).toBe(400);
  });
});
