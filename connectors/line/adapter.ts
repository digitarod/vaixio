import { z } from "zod";
import { resolveCredential } from "../../core/auth-vault/index.js";
import type { ToolInvocationResult } from "../../core/domain/schemas.js";
import type { Connector, ConnectorContext, HealthStatus } from "../../core/ports/connector.js";

/**
 * LINEコネクタ。顧客ごとのチャネルアクセストークン(vault://<customer>/line)を使う。
 * Instagramと異なりOAuth自己連携は無く、LINE Official Accountの管理画面で発行した
 * トークンを運用者が customers/<name>/config.yaml 経由で設定する運用（仕様: specs/line-connector.md）。
 */
const LINE_API_BASE = "https://api.line.me/v2/bot";

const MessageSendArgs = z.object({
  to: z.string().min(1),
  message: z.string().min(1).max(5000),
});

const ProfileGetArgs = z.object({
  userId: z.string().min(1),
});

const LineProfileResponse = z.object({
  displayName: z.string(),
  userId: z.string(),
  pictureUrl: z.string().optional(),
  statusMessage: z.string().optional(),
});

const adapter: Connector = {
  async invoke(toolName: string, args: unknown, ctx: ConnectorContext): Promise<ToolInvocationResult> {
    switch (toolName) {
      case "line.message.send":
        return sendMessage(MessageSendArgs.parse(args), ctx);
      case "line.profile.get":
        return getProfile(ProfileGetArgs.parse(args), ctx);
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
    // チャネルアクセストークンは顧客ごとのためコネクタ単位の疎通確認は行わない。
    // アダプタ自体が正常にロードできていることのみを示す。
    return { platform: "line", healthy: true };
  },
};

async function sendMessage(
  args: z.infer<typeof MessageSendArgs>,
  ctx: ConnectorContext,
): Promise<ToolInvocationResult> {
  if (ctx.dryRun) {
    return { ok: true, data: { dry_run: true, would_send: { to: args.to, message: args.message } } };
  }

  const token = resolveCredential(`vault://${ctx.customer}/line`);
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: args.to, messages: [{ type: "text", text: args.message }] }),
  });

  if (!res.ok) throwLineError(res.status, await res.json().catch(() => undefined));
  return { ok: true, data: { delivered: true } };
}

async function getProfile(args: z.infer<typeof ProfileGetArgs>, ctx: ConnectorContext): Promise<ToolInvocationResult> {
  const token = resolveCredential(`vault://${ctx.customer}/line`);
  const res = await fetch(`${LINE_API_BASE}/profile/${encodeURIComponent(args.userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: `profile not found for userId: ${args.userId}`,
        retriable: false,
        hint: "指定のuserIdは友だち追加/ブロック解除されていないため取得できません",
      },
    };
  }
  if (!res.ok) throwLineError(res.status, await res.json().catch(() => undefined));

  // §8.4: 外部APIの応答は境界で自前検証してから正規化する。
  const profile = LineProfileResponse.parse(await res.json());
  return { ok: true, data: profile };
}

function throwLineError(status: number, body: unknown): never {
  throw Object.assign(new Error(`line api error (${status}): ${JSON.stringify(body)}`), { status });
}

export default adapter;
