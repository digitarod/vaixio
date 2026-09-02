import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "../../core/db/client.js";
import { upsertCustomer } from "../../core/db/repositories/customers.js";
import { mountDashboardApi } from "./mount.js";

/**
 * サービス層のユニットテスト(auth-service.test.ts)ではCookie配線・HTTPステータスコードを
 * 検証できないため、実際にExpressアプリを起動してHTTP経由で確認する統合テスト。
 */
const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("dashboard-api HTTP routing", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    mountDashboardApi(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    if (address && typeof address === "object") baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeDb();
  });

  it("register -> me works via cookie, and unauthenticated /me is 401", async () => {
    const slug = `http-test-${Date.now()}`;
    await upsertCustomer(slug);
    const email = `http-${Date.now()}@example.com`;

    const registerRes = await fetch(`${baseUrl}/dashboard-api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_slug: slug, email, password: "hunter2hunter2" }),
    });
    expect(registerRes.status).toBe(201);
    const cookie = registerRes.headers.get("set-cookie");
    expect(cookie).toContain("dashboard_session=");
    expect(cookie).toContain("HttpOnly");

    const meRes = await fetch(`${baseUrl}/dashboard-api/me`, { headers: { Cookie: cookie ?? "" } });
    expect(meRes.status).toBe(200);
    expect(await meRes.json()).toMatchObject({ email, customerSlug: slug });

    const unauthedRes = await fetch(`${baseUrl}/dashboard-api/me`);
    expect(unauthedRes.status).toBe(401);
  });

  it("rejects registration with a short password", async () => {
    const slug = `http-test-short-${Date.now()}`;
    await upsertCustomer(slug);

    const res = await fetch(`${baseUrl}/dashboard-api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_slug: slug, email: "short@example.com", password: "short" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for registration against an unknown customer slug", async () => {
    const res = await fetch(`${baseUrl}/dashboard-api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_slug: "no-such-slug", email: "x@example.com", password: "hunter2hunter2" }),
    });
    expect(res.status).toBe(404);
  });

  it("logout clears the session so a subsequent /me is 401", async () => {
    const slug = `http-test-logout-${Date.now()}`;
    await upsertCustomer(slug);
    const email = `logout-http-${Date.now()}@example.com`;

    const registerRes = await fetch(`${baseUrl}/dashboard-api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_slug: slug, email, password: "hunter2hunter2" }),
    });
    const cookie = registerRes.headers.get("set-cookie") ?? "";

    const logoutRes = await fetch(`${baseUrl}/dashboard-api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(204);

    const meRes = await fetch(`${baseUrl}/dashboard-api/me`, { headers: { Cookie: cookie } });
    expect(meRes.status).toBe(401);
  });
});
