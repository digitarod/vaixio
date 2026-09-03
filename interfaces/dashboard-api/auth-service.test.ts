import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../core/db/client.js";
import { upsertCustomer } from "../../core/db/repositories/customers.js";
import {
  AuthError,
  loginDashboardUser,
  loginOrRegisterWithGoogle,
  logoutDashboardUser,
  registerDashboardUser,
  resolveSession,
} from "./auth-service.js";

const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("auth-service", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("registers a user for an existing customer and returns a valid session", async () => {
    const slug = `auth-test-${Date.now()}-a`;
    await upsertCustomer(slug);
    const email = `register-${Date.now()}@example.com`;

    const result = await registerDashboardUser({ customerSlug: slug, email, password: "hunter2hunter2" });

    expect(result.user.email).toBe(email);
    const resolved = await resolveSession(result.sessionId);
    expect(resolved?.email).toBe(email);
  });

  it("refuses to register for a customer that has no config.yaml projection", async () => {
    await expect(
      registerDashboardUser({ customerSlug: "no-such-customer-slug", email: "x@example.com", password: "hunter2hunter2" }),
    ).rejects.toMatchObject({ code: "CUSTOMER_NOT_FOUND" } satisfies Partial<AuthError>);
  });

  it("refuses to register a duplicate email", async () => {
    const slug = `auth-test-${Date.now()}-b`;
    await upsertCustomer(slug);
    const email = `dup-${Date.now()}@example.com`;
    await registerDashboardUser({ customerSlug: slug, email, password: "hunter2hunter2" });

    await expect(registerDashboardUser({ customerSlug: slug, email, password: "different" })).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    } satisfies Partial<AuthError>);
  });

  it("logs in with the correct password and rejects the wrong one", async () => {
    const slug = `auth-test-${Date.now()}-c`;
    await upsertCustomer(slug);
    const email = `login-${Date.now()}@example.com`;
    await registerDashboardUser({ customerSlug: slug, email, password: "correct-password" });

    const loggedIn = await loginDashboardUser({ email, password: "correct-password" });
    expect(loggedIn.user.email).toBe(email);

    await expect(loginDashboardUser({ email, password: "wrong-password" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthError>);
  });

  it("rejects login for an unknown email without leaking whether the account exists", async () => {
    await expect(loginDashboardUser({ email: "ghost@example.com", password: "anything" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthError>);
  });

  it("invalidates the session on logout", async () => {
    const slug = `auth-test-${Date.now()}-d`;
    await upsertCustomer(slug);
    const email = `logout-${Date.now()}@example.com`;
    const { sessionId } = await registerDashboardUser({ customerSlug: slug, email, password: "hunter2hunter2" });

    await logoutDashboardUser(sessionId);
    expect(await resolveSession(sessionId)).toBeUndefined();
  });

  describe("loginOrRegisterWithGoogle", () => {
    it("creates a new passwordless account when a customer_slug is provided", async () => {
      const slug = `auth-test-google-${Date.now()}-a`;
      await upsertCustomer(slug);
      const email = `google-new-${Date.now()}@example.com`;

      const result = await loginOrRegisterWithGoogle({ googleId: `g-${Date.now()}-a`, email, customerSlug: slug });
      expect(result.user.email).toBe(email);
      expect(await resolveSession(result.sessionId)).toMatchObject({ email });
    });

    it("refuses a brand-new Google account with no customer_slug", async () => {
      await expect(
        loginOrRegisterWithGoogle({ googleId: `g-${Date.now()}-b`, email: `google-none-${Date.now()}@example.com`, customerSlug: undefined }),
      ).rejects.toMatchObject({ code: "CUSTOMER_NOT_FOUND" } satisfies Partial<AuthError>);
    });

    it("logs an existing Google-linked account back in on a second call (matches by google_id)", async () => {
      const slug = `auth-test-google-${Date.now()}-c`;
      await upsertCustomer(slug);
      const email = `google-repeat-${Date.now()}@example.com`;
      const googleId = `g-${Date.now()}-c`;

      const first = await loginOrRegisterWithGoogle({ googleId, email, customerSlug: slug });
      const second = await loginOrRegisterWithGoogle({ googleId, email, customerSlug: undefined });

      expect(second.user.id).toBe(first.user.id);
      expect(second.sessionId).not.toBe(first.sessionId);
    });

    it("links a Google id to an existing password account with the same email instead of erroring", async () => {
      const slug = `auth-test-google-${Date.now()}-d`;
      await upsertCustomer(slug);
      const email = `google-link-${Date.now()}@example.com`;
      const passwordAccount = await registerDashboardUser({ customerSlug: slug, email, password: "hunter2hunter2" });

      const linked = await loginOrRegisterWithGoogle({ googleId: `g-${Date.now()}-d`, email, customerSlug: undefined });
      expect(linked.user.id).toBe(passwordAccount.user.id);

      // 既存のパスワードログインも引き続き使える(アカウント統合であって置き換えではない)。
      const stillWorks = await loginDashboardUser({ email, password: "hunter2hunter2" });
      expect(stillWorks.user.id).toBe(passwordAccount.user.id);
    });
  });
});
