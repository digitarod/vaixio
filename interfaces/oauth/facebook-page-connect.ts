import { createHmac, timingSafeEqual } from "node:crypto";
import type { Express } from "express";
import { saveOAuthToken } from "../../core/auth-vault/token-store.js";
import { loadCustomerConfig } from "../../core/registry/customer-config.js";

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Facebookページ連携。顧客はここのURLをブラウザで開いてFacebookログインするだけで連携が完了し、
 * Graph APIのページアクセストークンを直接扱う必要が無い（core/auth-vault/token-store が保存する）。
 *
 * ユーザーアクセストークンを長期化してから /me/accounts でページ一覧を取得し、最初のページの
 * ページアクセストークンを使う（複数ページ運用時の選択UIは今回スコープ外、Instagramの
 * fetchProfileと同じ簡略化方針）。ページアクセストークンは長期ユーザートークンから
 * 発行されていれば実質失効しない。
 *
 * 必須環境変数: FACEBOOK_APP_ID / FACEBOOK_APP_SECRET / VAIXIO_PUBLIC_BASE_URL / OAUTH_STATE_SECRET
 */
export function mountFacebookPageOAuth(app: Express): void {
  app.get("/oauth/facebook-page/start", async (req, res) => {
    const customer = String(req.query.customer ?? "");
    const config = customer ? await loadCustomerConfig(customer) : undefined;
    if (!config) {
      res.status(404).send("unknown customer");
      return;
    }

    const state = signState(customer);
    const scope = ["pages_show_list", "pages_manage_posts", "pages_read_engagement"].join(",");

    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", requireEnv("FACEBOOK_APP_ID"));
    url.searchParams.set("redirect_uri", callbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scope);
    url.searchParams.set("state", state);

    res.redirect(url.toString());
  });

  app.get("/oauth/facebook-page/callback", async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const customer = verifyState(state);

    if (req.query.error) {
      res.status(400).send(`Facebook authorization was denied: ${String(req.query.error_description ?? req.query.error)}`);
      return;
    }
    if (!code || !customer) {
      res.status(400).send("invalid or expired oauth state");
      return;
    }

    try {
      const shortLived = await exchangeCodeForToken(code);
      const longLived = await exchangeForLongLivedToken(shortLived.access_token);
      const page = await fetchFirstPage(longLived.access_token);

      await saveOAuthToken({
        platform: "facebook_page",
        customer,
        accessToken: page.access_token,
        accountId: page.id,
        accountName: page.name,
        obtainedAt: new Date().toISOString(),
        expiresAt: null,
      });

      res.send(`Facebookページ「${page.name}」を ${customer} に連携しました。このタブは閉じて構いません。`);
    } catch (err) {
      res.status(502).send(`Facebookページ連携に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

function callbackUrl(): string {
  return new URL("/oauth/facebook-page/callback", requireEnv("VAIXIO_PUBLIC_BASE_URL")).toString();
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
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("client_id", requireEnv("FACEBOOK_APP_ID"));
  url.searchParams.set("client_secret", requireEnv("FACEBOOK_APP_SECRET"));
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("code", code);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`code exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string };
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string }> {
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", requireEnv("FACEBOOK_APP_ID"));
  url.searchParams.set("client_secret", requireEnv("FACEBOOK_APP_SECRET"));
  url.searchParams.set("fb_exchange_token", shortLivedToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`long-lived token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string };
}

async function fetchFirstPage(userAccessToken: string): Promise<{ id: string; name: string; access_token: string }> {
  const url = new URL("https://graph.facebook.com/v21.0/me/accounts");
  url.searchParams.set("access_token", userAccessToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pages fetch failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { data?: { id: string; name: string; access_token: string }[] };
  const first = body.data?.[0];
  if (!first) throw new Error("このFacebookアカウントで管理しているページが見つかりません");
  return first;
}
