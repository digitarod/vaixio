import { listOAuthTokens, saveOAuthToken } from "../../core/auth-vault/token-store.js";
import { log } from "../../core/telemetry/logger.js";

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 期限の7日前から更新対象にする
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12時間おきにチェック

/**
 * Instagramの長期アクセストークン(60日)を、失効前に自動延長するバックグラウンドジョブ。
 * これが無いと「OAuthで連携さえすればずっと投稿できる」ことにはならず、
 * 60日ごとに顧客に再連携してもらう必要が出てしまう。
 * サーバープロセスが動いている前提の最小実装（別ワーカー/cronは使わない）。
 */
export function startInstagramTokenRefreshJob(): NodeJS.Timeout {
  const run = (): void => {
    refreshDueTokens().catch((err) => {
      void log({
        trace_id: "job_instagram_token_refresh",
        tool: "instagram.oauth.refresh",
        phase: "job_failed",
        error_code: "UNKNOWN",
        message: err instanceof Error ? err.message : String(err),
      });
    });
  };
  run();
  return setInterval(run, CHECK_INTERVAL_MS);
}

async function refreshDueTokens(): Promise<void> {
  const tokens = await listOAuthTokens();
  const now = Date.now();

  for (const token of tokens) {
    if (token.platform !== "instagram" || !token.expiresAt) continue;
    if (new Date(token.expiresAt).getTime() - now > REFRESH_WINDOW_MS) continue;

    try {
      const refreshed = await refreshLongLivedToken(token.accessToken);
      await saveOAuthToken({
        ...token,
        accessToken: refreshed.access_token,
        obtainedAt: new Date().toISOString(),
        expiresAt: new Date(now + refreshed.expires_in * 1000).toISOString(),
      });
      await log({
        trace_id: `job_instagram_token_refresh_${token.customer}`,
        customer: token.customer,
        tool: "instagram.oauth.refresh",
        phase: "refreshed",
        error_code: null,
      });
    } catch (err) {
      await log({
        trace_id: `job_instagram_token_refresh_${token.customer}`,
        customer: token.customer,
        tool: "instagram.oauth.refresh",
        phase: "refresh_failed",
        error_code: "UPSTREAM_DOWN",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

async function refreshLongLivedToken(accessToken: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`refresh_access_token failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}
