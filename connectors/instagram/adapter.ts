import { z } from "zod";
import { getOAuthToken } from "../../core/auth-vault/token-store.js";
import type { ToolInvocationResult } from "../../core/domain/schemas.js";
import type { Connector, ConnectorContext, HealthStatus } from "../../core/ports/connector.js";

/**
 * Instagram コネクタ。Meta Graph API (Instagram API with Instagram Login) に直接投稿する。
 * 顧客はGraph APIトークンを扱わず、`GET /oauth/instagram/start?customer=<name>` を
 * ブラウザで開いてログインするだけで連携が完了する（interfaces/oauth/instagram-connect.ts）。
 * 連携済みトークンは core/auth-vault/token-store が暗号化保存し、ここでは読むだけ。
 */
const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";
const CONTAINER_POLL_ATTEMPTS = 10;
const CONTAINER_POLL_INTERVAL_MS = 2000;

const PostCreateArgs = z.object({
  caption: z.string().max(2200),
  media: z
    .array(z.object({ url: z.string().url(), type: z.enum(["image", "video"]) }))
    .min(1)
    .max(10),
  first_comment: z.string().optional(),
});

const adapter: Connector = {
  async invoke(toolName: string, args: unknown, ctx: ConnectorContext): Promise<ToolInvocationResult> {
    switch (toolName) {
      case "instagram.post.create":
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
    const missing = ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET", "MUSUBI_PUBLIC_BASE_URL", "OAUTH_STATE_SECRET"].filter(
      (name) => !process.env[name],
    );
    if (missing.length > 0) {
      return { platform: "instagram", healthy: false, detail: `未設定の環境変数: ${missing.join(", ")}` };
    }
    // 顧客個別のトークンはここでは検証しない（customer文脈が無いため）。
    // 実際の疎通は musubi.connector.smoke や個別顧客での投稿確認で行う。
    return { platform: "instagram", healthy: true };
  },
};

async function createPost(
  args: z.infer<typeof PostCreateArgs>,
  ctx: ConnectorContext,
): Promise<ToolInvocationResult> {
  const token = await getOAuthToken(ctx.customer, "instagram");
  if (!token) {
    return {
      ok: false,
      error: {
        code: "AUTH_EXPIRED",
        message: `no connected instagram account for customer ${ctx.customer}`,
        retriable: false,
        hint: `顧客がまだInstagramを連携していません。/oauth/instagram/start?customer=${ctx.customer} をブラウザで開いて連携してください`,
      },
    };
  }

  if (ctx.dryRun) {
    return {
      ok: true,
      data: {
        dry_run: true,
        would_post_as: token.accountName,
        account_id: token.accountId,
        caption: args.caption,
        media: args.media,
      },
    };
  }

  const accessToken = token.accessToken;
  const igUserId = token.accountId;

  const childIds =
    args.media.length > 1
      ? await Promise.all(args.media.map((m) => createContainer(igUserId, accessToken, m, { isCarouselItem: true })))
      : undefined;

  const containerId = childIds
    ? await createCarouselContainer(igUserId, accessToken, childIds, args.caption)
    : await createContainer(igUserId, accessToken, args.media[0], { caption: args.caption });

  await waitUntilReady(containerId, accessToken);
  const mediaId = await publishContainer(igUserId, accessToken, containerId);

  if (args.first_comment) {
    await postComment(mediaId, accessToken, args.first_comment).catch(() => undefined);
  }

  return { ok: true, data: { media_id: mediaId, account_id: igUserId } };
}

async function createContainer(
  igUserId: string,
  accessToken: string,
  media: { url: string; type: "image" | "video" },
  opts: { caption?: string; isCarouselItem?: boolean },
): Promise<string> {
  const params = new URLSearchParams({ access_token: accessToken });
  if (media.type === "image") params.set("image_url", media.url);
  else {
    params.set("video_url", media.url);
    if (!opts.isCarouselItem) params.set("media_type", "VIDEO");
  }
  if (opts.isCarouselItem) params.set("is_carousel_item", "true");
  if (opts.caption) params.set("caption", opts.caption);

  const body = await graphPost(`${igUserId}/media`, params);
  return body.id as string;
}

async function createCarouselContainer(
  igUserId: string,
  accessToken: string,
  childIds: string[],
  caption: string,
): Promise<string> {
  const params = new URLSearchParams({
    access_token: accessToken,
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  });
  const body = await graphPost(`${igUserId}/media`, params);
  return body.id as string;
}

async function publishContainer(igUserId: string, accessToken: string, containerId: string): Promise<string> {
  const params = new URLSearchParams({ access_token: accessToken, creation_id: containerId });
  const body = await graphPost(`${igUserId}/media_publish`, params);
  return body.id as string;
}

async function waitUntilReady(containerId: string, accessToken: string): Promise<void> {
  for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt += 1) {
    const url = new URL(`${GRAPH_API_BASE}/${containerId}`);
    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throwGraphError(res.status, body);

    const status = (body as { status_code?: string }).status_code;
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw Object.assign(new Error(`instagram media container ${status}`), { status: 502 });
    }
    await new Promise((resolve) => setTimeout(resolve, CONTAINER_POLL_INTERVAL_MS));
  }
  throw Object.assign(new Error("instagram media container did not finish processing in time"), { status: 504 });
}

async function postComment(mediaId: string, accessToken: string, message: string): Promise<void> {
  const params = new URLSearchParams({ access_token: accessToken, message });
  await graphPost(`${mediaId}/comments`, params);
}

async function graphPost(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH_API_BASE}/${path}`, { method: "POST", body: params });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throwGraphError(res.status, body);
  return body as Record<string, unknown>;
}

function throwGraphError(status: number, body: unknown): never {
  throw Object.assign(new Error(`instagram graph api error (${status}): ${JSON.stringify(body)}`), { status });
}

export default adapter;
