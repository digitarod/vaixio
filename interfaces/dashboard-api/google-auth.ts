import { createHmac, timingSafeEqual } from "node:crypto";
import { serialize } from "cookie";
import type { Express } from "express";
import { z } from "zod";
import { AuthError, loginOrRegisterWithGoogle } from "./auth-service.js";

const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_COOKIE = "dashboard_session";

const GoogleUserInfo = z.object({
  sub: z.string(),
  email: z.string(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

/**
 * §specs/dashboard-google-login.md: メール＋パスワードに加えたダッシュボードの
 * ログイン方法。core/auth-vaultのInstagram連携用OAuth(顧客のプラットフォーム連携)とは
 * 別物 — こちらは「人間がダッシュボードにログインする方法」そのものなので
 * interfaces/dashboard-api 配下に置く。
 */
export function mountGoogleAuth(app: Express): void {
  app.get("/dashboard-api/auth/google/start", (req, res) => {
    const customerSlug = typeof req.query.customer_slug === "string" ? req.query.customer_slug : undefined;
    const state = signState(customerSlug);

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
    url.searchParams.set("redirect_uri", callbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "online");
    url.searchParams.set("state", state);

    res.redirect(url.toString());
  });

  app.get("/dashboard-api/auth/google/callback", async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const parsedState = verifyState(state);

    if (req.query.error) {
      res.status(400).send(`Google authorization was denied: ${String(req.query.error)}`);
      return;
    }
    if (!code || !parsedState) {
      res.status(400).send("invalid or expired oauth state");
      return;
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      const userInfo = GoogleUserInfo.parse(await fetchUserInfo(tokens.access_token));

      const { sessionId } = await loginOrRegisterWithGoogle({
        googleId: userInfo.sub,
        email: userInfo.email,
        customerSlug: parsedState.customerSlug,
      });

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
      res.redirect("/connections");
    } catch (err) {
      if (err instanceof AuthError && err.code === "CUSTOMER_NOT_FOUND") {
        res.status(400).send("このGoogleアカウントに紐づくアカウントがありません。先に新規登録画面からお客様IDを指定して登録してください");
        return;
      }
      res.status(502).send(`Googleログインに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

interface StateData {
  customerSlug: string | undefined;
}

function signState(customerSlug: string | undefined): string {
  const payload = `${customerSlug ?? ""}.${Date.now()}`;
  const sig = createHmac("sha256", requireEnv("OAUTH_STATE_SECRET")).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyState(state: string): StateData | undefined {
  const parts = state.split(".");
  if (parts.length !== 3) return undefined;
  const [customerSlugRaw, tsRaw, sig] = parts;
  const payload = `${customerSlugRaw}.${tsRaw}`;
  const expected = createHmac("sha256", requireEnv("OAUTH_STATE_SECRET")).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || Date.now() - ts > STATE_TTL_MS) return undefined;
  return { customerSlug: customerSlugRaw || undefined };
}

function callbackUrl(): string {
  return new URL("/dashboard-api/auth/google/callback", requireEnv("VAIXIO_PUBLIC_BASE_URL")).toString();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が未設定です`);
  return value;
}

async function exchangeCodeForTokens(code: string): Promise<{ access_token: string }> {
  const form = new URLSearchParams({
    code,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: callbackUrl(),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: form });
  if (!res.ok) throw new Error(`google token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string };
}

async function fetchUserInfo(accessToken: string): Promise<unknown> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google userinfo fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}
