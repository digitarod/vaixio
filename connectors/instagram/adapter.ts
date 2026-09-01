import { z } from "zod";
import { resolveCredential } from "../../core/auth-vault/index.js";
import type { ToolInvocationResult } from "../../core/domain/schemas.js";
import type { Connector, ConnectorContext, HealthStatus } from "../../core/ports/connector.js";

/**
 * Instagram コネクタ。実体は Zernio (https://zernio.com) の統一投稿API。
 * Zernio 1アカウントで複数クライアントのInstagramプロフィールを束ねる運用を想定し、
 * APIキーはコネクタ単位の vault://instagram/api_key を使う（顧客ごとの account_id で対象を切り替える）。
 * 顧客ごとに別々のZernioアカウントを使う場合は customers/<name>/config.yaml の
 * credentials.instagram を経由する形に変更すること（現状は未対応、BACKLOG参照）。
 */
const ZERNIO_BASE_URL = "https://zernio.com/api/v1";

const PostCreateArgs = z.object({
  account_id: z.string(),
  caption: z.string().max(2200),
  media: z
    .array(z.object({ url: z.string().url(), type: z.enum(["image", "video"]) }))
    .min(1)
    .max(10),
  first_comment: z.string().optional(),
});

const ZernioPostResponse = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
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
    try {
      const apiKey = resolveCredential("vault://instagram/api_key");
      // GET /v1/posts は一覧取得の確認済みエンドポイント。存在確認代わりに軽量に叩く。
      const res = await fetch(`${ZERNIO_BASE_URL}/posts?limit=1`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { platform: "instagram", healthy: res.ok, detail: res.ok ? undefined : `zernio status ${res.status}` };
    } catch (err) {
      return { platform: "instagram", healthy: false, detail: err instanceof Error ? err.message : String(err) };
    }
  },
};

async function createPost(
  args: z.infer<typeof PostCreateArgs>,
  ctx: ConnectorContext,
): Promise<ToolInvocationResult> {
  const requestBody = {
    content: args.caption,
    mediaItems: args.media.map((m) => ({ url: m.url, type: m.type })),
    platforms: [
      {
        platform: "instagram",
        accountId: args.account_id,
        ...(args.first_comment ? { platformSpecificData: { firstComment: args.first_comment } } : {}),
      },
    ],
    publishNow: true,
  };

  if (ctx.dryRun) {
    return { ok: true, data: { dry_run: true, would_send: requestBody } };
  }

  const apiKey = resolveCredential("vault://instagram/api_key");
  const res = await fetch(`${ZERNIO_BASE_URL}/posts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const rawBody = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw Object.assign(new Error(`zernio posts API returned ${res.status}: ${JSON.stringify(rawBody)}`), {
      status: res.status,
    });
  }

  // §8.4: 外部APIの応答は境界で自前検証してから正規化する。
  const parsed = ZernioPostResponse.parse(rawBody);
  return { ok: true, data: { post_id: parsed.id, status: parsed.status ?? "submitted" } };
}

export default adapter;
