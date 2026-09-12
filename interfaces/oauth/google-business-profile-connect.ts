import { createHmac, timingSafeEqual } from "node:crypto";
import type { Express } from "express";
import { saveOAuthToken } from "../../core/auth-vault/token-store.js";
import { loadCustomerConfig } from "../../core/registry/customer-config.js";

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Googleビジネスプロフィール連携。顧客はここのURLをブラウザで開いてGoogleアカウントで
 * ログインするだけで連携が完了し、Business Profile APIのアクセストークンを直接扱う必要が無い
 * （core/auth-vault/token-store が保存する）。
 *
 * アクセストークンは約1時間で失効するため、`access_type=offline`+`prompt=consent`で
 * 必ずrefresh_tokenを取得する（connectors/google-business-profile/adapter.ts が呼び出しの
 * 都度失効を確認して更新する。specs/google-business-profile-connector.md）。
 *
 * 必須環境変数: GOOGLE_BUSINESS_PROFILE_CLIENT_ID / GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET /
 * VAIXIO_PUBLIC_BASE_URL / OAUTH_STATE_SECRET
 */
export function mountGoogleBusinessProfileOAuth(app: Express): void {
  app.get("/oauth/google-business-profile/start", async (req, res) => {
    const customer = String(req.query.customer ?? "");
    const config = customer ? await loadCustomerConfig(customer) : undefined;
    if (!config) {
      res.status(404).send("unknown customer");
      return;
    }

    const state = signState(customer);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", requireEnv("GOOGLE_BUSINESS_PROFILE_CLIENT_ID"));
    url.searchParams.set("redirect_uri", callbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "https://www.googleapis.com/auth/business.manage");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    res.redirect(url.toString());
  });

  app.get("/oauth/google-business-profile/callback", async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const customer = verifyState(state);

    if (req.query.error) {
      res.status(400).send(`Google authorization was denied: ${String(req.query.error_description ?? req.query.error)}`);
      return;
    }
    if (!code || !customer) {
      res.status(400).send("invalid or expired oauth state");
      return;
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      if (!tokens.refresh_token) {
        res.status(502).send(
          "Googleからrefresh_tokenを取得できませんでした。既に一度連携済みのアカウントの場合、Googleアカウントの権限設定からVAIXIOへのアクセスを一度取り消してから再度お試しください。",
        );
        return;
      }
      const account = await fetchFirstAccount(tokens.access_token);

      await saveOAuthToken({
        platform: "google_business_profile",
        customer,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accountId: account.accountId,
        accountName: account.accountName,
        obtainedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      });

      res.send(
        `Googleビジネスプロフィール「${account.accountName ?? account.accountId}」を ${customer} に連携しました。このタブは閉じて構いません。`,
      );
    } catch (err) {
      res.status(502).send(`Googleビジネスプロフィール連携に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

function callbackUrl(): string {
  return new URL("/oauth/google-business-profile/callback", requireEnv("VAIXIO_PUBLIC_BASE_URL")).toString();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が未設定です`);
  return value;
}

function signState(customer: string): string {
  const payload = `${customer}.${Date.now()}`;
  const sig = createHmac("sha256", requireEnv("OAUTH_STATE_SECRET")).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyState(state: string): string | undefined {
  const parts = state.split(".");
  if (parts.length !== 3) return undefined;
  const [customer, tsRaw, sig] = parts;
  const payload = `${customer}.${tsRaw}`;
  const expected = createHmac("sha256", requireEnv("OAUTH_STATE_SECRET")).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || Date.now() - ts > STATE_TTL_MS) return undefined;
  return customer;
}

async function exchangeCodeForTokens(
  code: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const form = new URLSearchParams({
    code,
    client_id: requireEnv("GOOGLE_BUSINESS_PROFILE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET"),
    redirect_uri: callbackUrl(),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: form });
  if (!res.ok) throw new Error(`code exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

async function fetchFirstAccount(accessToken: string): Promise<{ accountId: string; accountName?: string }> {
  const res = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`accounts fetch failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { accounts?: { name: string; accountName?: string }[] };
  const first = body.accounts?.[0];
  if (!first) throw new Error("このGoogleアカウントに紐づくビジネスプロフィールが見つかりません");
  return { accountId: first.name.replace(/^accounts\//, ""), accountName: first.accountName };
}
