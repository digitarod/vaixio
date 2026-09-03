import { createHmac, timingSafeEqual } from "node:crypto";
import type { Express } from "express";
import { saveOAuthToken } from "../../core/auth-vault/token-store.js";
import { loadCustomerConfig } from "../../core/registry/customer-config.js";

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Instagram Business Login（Facebookページ不要の Instagram API with Instagram Login）。
 * 顧客はここのURLをブラウザで開いてログインするだけで連携が完了し、
 * Graph APIのアクセストークンを直接扱う必要がない（core/auth-vault/token-store が保存する）。
 *
 * 必須環境変数: INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET / VAIXIO_PUBLIC_BASE_URL / OAUTH_STATE_SECRET
 */
export function mountInstagramOAuth(app: Express): void {
  app.get("/oauth/instagram/start", async (req, res) => {
    const customer = String(req.query.customer ?? "");
    const config = customer ? await loadCustomerConfig(customer) : undefined;
    if (!config) {
      res.status(404).send("unknown customer");
      return;
    }

    const appId = requireEnv("INSTAGRAM_APP_ID");
    const redirectUri = callbackUrl();
    const state = signState(customer);
    const scope = ["instagram_business_basic", "instagram_business_content_publish"].join(",");

    const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", appId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", scope);
    authorizeUrl.searchParams.set("state", state);

    res.redirect(authorizeUrl.toString());
  });

  app.get("/oauth/instagram/callback", async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const customer = verifyState(state);

    if (req.query.error) {
      res.status(400).send(`Instagram authorization was denied: ${String(req.query.error_description ?? req.query.error)}`);
      return;
    }
    if (!code || !customer) {
      res.status(400).send("invalid or expired oauth state");
      return;
    }

    try {
      const shortLived = await exchangeCodeForToken(code);
      const longLived = await exchangeForLongLivedToken(shortLived.access_token);
      const profile = await fetchProfile(longLived.access_token);

      await saveOAuthToken({
        platform: "instagram",
        customer,
        accessToken: longLived.access_token,
        accountId: profile.id,
        accountName: profile.username,
        obtainedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + longLived.expires_in * 1000).toISOString(),
      });

      res.send(
        `Instagramアカウント @${profile.username} を ${customer} に連携しました。このタブは閉じて構いません。`,
      );
    } catch (err) {
      res.status(502).send(`Instagram連携に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

function callbackUrl(): string {
  return new URL("/oauth/instagram/callback", requireEnv("VAIXIO_PUBLIC_BASE_URL")).toString();
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

async function exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
  const form = new URLSearchParams({
    client_id: requireEnv("INSTAGRAM_APP_ID"),
    client_secret: requireEnv("INSTAGRAM_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: callbackUrl(),
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const body = (await res.json().catch(() => undefined)) as
    | { data: { access_token: string }[] }
    | { access_token: string }
    | undefined;
  if (!res.ok) throw new Error(`code exchange failed: ${res.status} ${JSON.stringify(body)}`);

  // Metaの応答形は data配列でラップされる場合とフラットな場合の両方が観測されているため両対応する。
  const accessToken = body && "data" in body ? body.data?.[0]?.access_token : body?.access_token;
  if (!accessToken) throw new Error(`code exchange returned no token: ${JSON.stringify(body)}`);
  return { access_token: accessToken };
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", requireEnv("INSTAGRAM_APP_SECRET"));
  url.searchParams.set("access_token", shortLivedToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`long-lived token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

async function fetchProfile(accessToken: string): Promise<{ id: string; username: string }> {
  const url = new URL("https://graph.instagram.com/v21.0/me");
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`profile fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string; username: string };
}
