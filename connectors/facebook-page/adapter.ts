import { z } from "zod";
import { getOAuthToken } from "../../core/auth-vault/token-store.js";
import type { ToolInvocationResult } from "../../core/domain/schemas.js";
import type { Connector, ConnectorContext, HealthStatus } from "../../core/ports/connector.js";

/**
 * Facebookページ コネクタ。Meta Graph API に直接投稿する。
 * 顧客はGraph APIトークンを扱わず、`GET /oauth/facebook-page/start?customer=<name>` を
 * ブラウザで開いてFacebookログインするだけで連携が完了する（interfaces/oauth/facebook-page-connect.ts）。
 * 連携済みトークン(ページアクセストークン)は core/auth-vault/token-store が暗号化保存し、ここでは読むだけ。
 */
const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

const PostCreateArgs = z.object({
  message: z.string().min(1).max(5000),
  image_url: z.string().url().optional(),
  link: z.string().url().optional(),
});

const adapter: Connector = {
  async invoke(toolName: string, args: unknown, ctx: ConnectorContext): Promise<ToolInvocationResult> {
    switch (toolName) {
      case "facebook_page.post.create":
        return createPost(PostCreateArgs.parse(args), ctx);
      default:
        return {
          ok: false,
          error: {
            code: "NOT_ALLOWED",
            message: `unknown tool: ${toolName}`,
            retriable: false,
            hint: "manifest.json の tools 一覧を確認してください",
          },
        };
    }
  },

  async healthCheck(): Promise<HealthStatus> {
    const missing = ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "VAIXIO_PUBLIC_BASE_URL", "OAUTH_STATE_SECRET"].filter(
      (name) => !process.env[name],
    );
    if (missing.length > 0) {
      return { platform: "facebook_page", healthy: false, detail: `未設定の環境変数: ${missing.join(", ")}` };
    }
    // 顧客個別のページトークンはここでは検証しない（customer文脈が無いため）。
    return { platform: "facebook_page", healthy: true };
  },
};

async function createPost(args: z.infer<typeof PostCreateArgs>, ctx: ConnectorContext): Promise<ToolInvocationResult> {
  const token = await getOAuthToken(ctx.customer, "facebook_page");
  if (!token) {
    return {
      ok: false,
      error: {
        code: "AUTH_EXPIRED",
        message: `no connected facebook page for customer ${ctx.customer}`,
        retriable: false,
        hint: `顧客がまだFacebookページを連携していません。/oauth/facebook-page/start?customer=${ctx.customer} をブラウザで開いて連携してください`,
      },
    };
  }

  if (ctx.dryRun) {
    return {
      ok: true,
      data: {
        dry_run: true,
        would_post_to: token.accountName,
        page_id: token.accountId,
        message: args.message,
        image_url: args.image_url,
        link: args.link,
      },
    };
  }

  const pageId = token.accountId;
  const pageAccessToken = token.accessToken;

  const body = args.image_url
    ? await graphPost(`${pageId}/photos`, { url: args.image_url, caption: args.message, access_token: pageAccessToken })
    : await graphPost(`${pageId}/feed`, { message: args.message, link: args.link, access_token: pageAccessToken });

  const postId = (body.post_id as string | undefined) ?? (body.id as string);
  return { ok: true, data: { post_id: postId, page_id: pageId } };
}

async function graphPost(path: string, params: Record<string, string | undefined>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.set(key, value);
  }
  const res = await fetch(`${GRAPH_API_BASE}/${path}`, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throwGraphError(res.status, json);
  return json as Record<string, unknown>;
}

function throwGraphError(status: number, body: unknown): never {
  throw Object.assign(new Error(`facebook graph api error (${status}): ${JSON.stringify(body)}`), { status });
}

export default adapter;
