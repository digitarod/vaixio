import { getOAuthToken, saveOAuthToken } from "../../core/auth-vault/token-store.js";
import type { OAuthTokenRecord, ToolError, ToolInvocationResult } from "../../core/domain/schemas.js";

/**
 * OAuthトークンの取得・更新のみを担う（1ファイル1責務、§7）。
 * Googleのアクセストークンは約1時間で失効するため、Instagramの定期ジョブ方式ではなく
 * 呼び出しの都度ここで期限を確認しrefresh_tokenで更新する（specs/google-business-profile-connector.md）。
 */
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function unconnectedError(customer: string): ToolInvocationResult {
  return {
    ok: false,
    error: {
      code: "AUTH_EXPIRED",
      message: `no connected google business profile account for customer ${customer}`,
      retriable: false,
      hint: `顧客がまだGoogleビジネスプロフィールを連携していません。/oauth/google-business-profile/start?customer=${customer} をブラウザで開いて連携してください`,
    },
  };
}

export async function requireConnectedToken(customer: string): Promise<ToolInvocationResult | undefined> {
  const token = await getOAuthToken(customer, "google_business_profile");
  return token ? undefined : unconnectedError(customer);
}

/** アクセストークンが失効間近/失効済みならrefresh_tokenで更新してから返す。失敗時はToolInvocationResultを返す。 */
export async function resolveFreshAccessToken(customer: string): Promise<string | ToolInvocationResult> {
  const token = await getOAuthToken(customer, "google_business_profile");
  if (!token) return unconnectedError(customer);

  const expiresAt = token.expiresAt ? new Date(token.expiresAt).getTime() : 0;
  if (expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) return token.accessToken;

  if (!token.refreshToken) {
    return {
      ok: false,
      error: {
        code: "AUTH_EXPIRED",
        message: `google business profile token for customer ${customer} has no refresh token`,
        retriable: false,
        hint: `再連携が必要です。/oauth/google-business-profile/start?customer=${customer} をブラウザで開いて連携し直してください`,
      },
    };
  }

  try {
    const refreshed = await refreshAccessToken(token.refreshToken);
    const updated: OAuthTokenRecord = {
      ...token,
      accessToken: refreshed.access_token,
      obtainedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    };
    await saveOAuthToken(updated);
    return updated.accessToken;
  } catch (err) {
    const toolError: ToolError = {
      code: "AUTH_EXPIRED",
      message: err instanceof Error ? err.message : String(err),
      retriable: false,
      hint: `トークンの更新に失敗しました。再連携が必要な可能性があります。/oauth/google-business-profile/start?customer=${customer} をブラウザで開いて連携し直してください`,
    };
    return { ok: false, error: toolError };
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const form = new URLSearchParams({
    client_id: requireEnv("GOOGLE_BUSINESS_PROFILE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: form });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が未設定です`);
  return value;
}
