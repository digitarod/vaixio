import { z } from "zod";
import type { ToolInvocationResult } from "../../core/domain/schemas.js";
import type { Connector, ConnectorContext, HealthStatus } from "../../core/ports/connector.js";
import { requireConnectedToken, resolveFreshAccessToken } from "./token.js";

/**
 * Googleビジネスプロフィール コネクタ。顧客はOAuthで連携するだけで、
 * `GET /oauth/google-business-profile/start?customer=<name>` をブラウザで開けば完了する
 * （interfaces/oauth/google-business-profile-connect.ts）。連携済みトークンは
 * core/auth-vault/token-store が暗号化保存し、ここでは読み書きする。
 *
 * Googleのアクセストークンは約1時間で失効するため、Instagramの定期ジョブ方式ではなく
 * 呼び出しの都度ここで期限を確認しrefresh_tokenで更新する（specs/google-business-profile-connector.md）。
 */
const ACCOUNT_MGMT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_MYBUSINESS_BASE = "https://mybusiness.googleapis.com/v4";
const DEFAULT_REVIEW_PAGE_SIZE = 20;

const LocationListArgs = z.object({});

const ReviewListArgs = z.object({
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  pageSize: z.number().int().min(1).max(50).optional(),
});

const ReviewReplyArgs = z.object({
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  reviewId: z.string().min(1),
  comment: z.string().min(1).max(4096),
});

const AccountsListResponse = z.object({
  accounts: z.array(z.object({ name: z.string(), accountName: z.string().optional() })).optional(),
});

const LocationsListResponse = z.object({
  locations: z
    .array(
      z.object({
        name: z.string(),
        title: z.string().optional(),
        storefrontAddress: z.object({ addressLines: z.array(z.string()).optional() }).optional(),
      }),
    )
    .optional(),
});

const ReviewsListResponse = z.object({
  reviews: z
    .array(
      z.object({
        reviewId: z.string(),
        reviewer: z.object({ displayName: z.string().optional() }).optional(),
        starRating: z.string().optional(),
        comment: z.string().optional(),
        createTime: z.string().optional(),
        reviewReply: z.object({ comment: z.string().optional(), updateTime: z.string().optional() }).optional(),
      }),
    )
    .optional(),
  averageRating: z.number().optional(),
  totalReviewCount: z.number().optional(),
});

const ReviewReplyResponse = z.object({
  comment: z.string(),
  updateTime: z.string(),
});

const adapter: Connector = {
  async invoke(toolName: string, args: unknown, ctx: ConnectorContext): Promise<ToolInvocationResult> {
    switch (toolName) {
      case "google_business_profile.location.list":
        return listLocations(LocationListArgs.parse(args), ctx);
      case "google_business_profile.review.list":
        return listReviews(ReviewListArgs.parse(args), ctx);
      case "google_business_profile.review.reply":
        return replyToReview(ReviewReplyArgs.parse(args), ctx);
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
    const missing = [
      "GOOGLE_BUSINESS_PROFILE_CLIENT_ID",
      "GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET",
      "VAIXIO_PUBLIC_BASE_URL",
      "OAUTH_STATE_SECRET",
    ].filter((name) => !process.env[name]);
    if (missing.length > 0) {
      return { platform: "google_business_profile", healthy: false, detail: `未設定の環境変数: ${missing.join(", ")}` };
    }
    // 顧客個別のトークンはここでは検証しない（customer文脈が無いため）。
    return { platform: "google_business_profile", healthy: true };
  },
};

async function listLocations(_args: z.infer<typeof LocationListArgs>, ctx: ConnectorContext): Promise<ToolInvocationResult> {
  const notConnected = await requireConnectedToken(ctx.customer);
  if (notConnected) return notConnected;

  const accessToken = await resolveFreshAccessToken(ctx.customer);
  if (typeof accessToken !== "string") return accessToken;

  const accounts = AccountsListResponse.parse(await gbpGet(`${ACCOUNT_MGMT_BASE}/accounts`, accessToken)).accounts ?? [];

  const results: Array<{ accountId: string; locationId: string; name: string; address?: string }> = [];
  for (const account of accounts) {
    const accountId = account.name.replace(/^accounts\//, "");
    const url = new URL(`${BUSINESS_INFO_BASE}/${account.name}/locations`);
    url.searchParams.set("readMask", "name,title,storefrontAddress");
    const body = LocationsListResponse.parse(await gbpGet(url.toString(), accessToken));
    for (const location of body.locations ?? []) {
      results.push({
        accountId,
        locationId: location.name.replace(/^locations\//, ""),
        name: location.title ?? location.name,
        address: location.storefrontAddress?.addressLines?.join(" "),
      });
    }
  }

  return { ok: true, data: { locations: results } };
}

async function listReviews(args: z.infer<typeof ReviewListArgs>, ctx: ConnectorContext): Promise<ToolInvocationResult> {
  const notConnected = await requireConnectedToken(ctx.customer);
  if (notConnected) return notConnected;

  const accessToken = await resolveFreshAccessToken(ctx.customer);
  if (typeof accessToken !== "string") return accessToken;

  const url = new URL(
    `${LEGACY_MYBUSINESS_BASE}/accounts/${args.accountId}/locations/${args.locationId}/reviews`,
  );
  url.searchParams.set("pageSize", String(args.pageSize ?? DEFAULT_REVIEW_PAGE_SIZE));

  const body = ReviewsListResponse.parse(await gbpGet(url.toString(), accessToken));
  return {
    ok: true,
    data: {
      reviews: (body.reviews ?? []).map((r) => ({
        reviewId: r.reviewId,
        reviewerName: r.reviewer?.displayName,
        starRating: r.starRating,
        comment: r.comment,
        createTime: r.createTime,
        reply: r.reviewReply?.comment,
      })),
      averageRating: body.averageRating,
      totalReviewCount: body.totalReviewCount,
    },
  };
}

async function replyToReview(args: z.infer<typeof ReviewReplyArgs>, ctx: ConnectorContext): Promise<ToolInvocationResult> {
  const notConnected = await requireConnectedToken(ctx.customer);
  if (notConnected) return notConnected;

  if (ctx.dryRun) {
    return {
      ok: true,
      data: { dry_run: true, would_reply: { reviewId: args.reviewId, comment: args.comment } },
    };
  }

  const accessToken = await resolveFreshAccessToken(ctx.customer);
  if (typeof accessToken !== "string") return accessToken;

  const url = `${LEGACY_MYBUSINESS_BASE}/accounts/${args.accountId}/locations/${args.locationId}/reviews/${args.reviewId}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ comment: args.comment }),
  });
  if (!res.ok) throwGbpError(res.status, await res.json().catch(() => undefined));

  const reply = ReviewReplyResponse.parse(await res.json());
  return { ok: true, data: { replied: true, comment: reply.comment, updateTime: reply.updateTime } };
}

async function gbpGet(url: string, accessToken: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throwGbpError(res.status, body);
  return body;
}

function throwGbpError(status: number, body: unknown): never {
  throw Object.assign(new Error(`google business profile api error (${status}): ${JSON.stringify(body)}`), { status });
}

export default adapter;
