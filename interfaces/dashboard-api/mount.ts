import { parse, serialize } from "cookie";
import type { Express, Request, Response } from "express";
import { listAuditEventsForCustomer } from "../../core/db/repositories/audit.js";
import { findCustomerById } from "../../core/db/repositories/customers.js";
import type { DashboardUserRecord } from "../../core/db/repositories/dashboard-users.js";
import { listOAuthTokens } from "../../core/auth-vault/token-store.js";
import { AuthError, loginDashboardUser, logoutDashboardUser, registerDashboardUser, resolveSession } from "./auth-service.js";

const SESSION_COOKIE = "dashboard_session";

/**
 * §B: 顧客セルフサービスダッシュボードの専用バックエンド。MCP/REST用のBearerトークン
 * 認証とは完全に別の信頼領域（httpOnly Cookie + Postgres上のサーバーセッション）。
 * Instagram連携は既存の /oauth/instagram/start にリンクするだけで、ここでは再実装しない。
 */
export function mountDashboardApi(app: Express): void {
  app.post("/dashboard-api/auth/register", async (req, res) => {
    const { customer_slug, email, password } = req.body ?? {};
    if (typeof customer_slug !== "string" || typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "customer_slug, email, password が必要です" });
      return;
    }
    if (password.length < 10) {
      res.status(400).json({ error: "パスワードは10文字以上にしてください" });
      return;
    }

    try {
      const { sessionId, user } = await registerDashboardUser({ customerSlug: customer_slug, email, password });
      setSessionCookie(res, sessionId);
      res.status(201).json({ email: user.email });
    } catch (err) {
      handleAuthError(err, res);
    }
  });

  app.post("/dashboard-api/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "email, password が必要です" });
      return;
    }

    try {
      const { sessionId, user } = await loginDashboardUser({ email, password });
      setSessionCookie(res, sessionId);
      res.json({ email: user.email });
    } catch (err) {
      handleAuthError(err, res);
    }
  });

  app.post("/dashboard-api/auth/logout", async (req, res) => {
    const sessionId = readSessionCookie(req);
    if (sessionId) await logoutDashboardUser(sessionId);
    res.clearCookie(SESSION_COOKIE);
    res.status(204).end();
  });

  app.get("/dashboard-api/me", requireAuth, async (req, res) => {
    const user = (req as AuthedRequest).dashboardUser;
    const customer = await findCustomerById(user.customerId);
    res.json({ email: user.email, customerSlug: customer?.slug });
  });

  app.get("/dashboard-api/connections", requireAuth, async (req, res) => {
    const user = (req as AuthedRequest).dashboardUser;
    const customer = await findCustomerById(user.customerId);
    const tokens = await listOAuthTokens();
    const mine = tokens
      .filter((t) => t.customer === customer?.slug)
      .map((t) => ({ platform: t.platform, accountName: t.accountName, expiresAt: t.expiresAt }));
    res.json({ connections: mine });
  });

  app.get("/dashboard-api/audit", requireAuth, async (req, res) => {
    const user = (req as AuthedRequest).dashboardUser;
    const events = await listAuditEventsForCustomer(user.customerId, 50);
    res.json({ events });
  });
}

interface AuthedRequest extends Request {
  dashboardUser: DashboardUserRecord;
}

async function requireAuth(req: Request, res: Response, next: () => void): Promise<void> {
  const sessionId = readSessionCookie(req);
  const user = sessionId ? await resolveSession(sessionId) : undefined;
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as AuthedRequest).dashboardUser = user;
  next();
}

function readSessionCookie(req: Request): string | undefined {
  const header = req.header("cookie");
  if (!header) return undefined;
  return parse(header)[SESSION_COOKIE];
}

function setSessionCookie(res: Response, sessionId: string): void {
  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    }),
  );
}

function handleAuthError(err: unknown, res: Response): void {
  if (err instanceof AuthError) {
    const status = err.code === "CUSTOMER_NOT_FOUND" ? 404 : err.code === "EMAIL_TAKEN" ? 409 : 401;
    res.status(status).json({ error: err.code });
    return;
  }
  res.status(500).json({ error: "internal error" });
}
