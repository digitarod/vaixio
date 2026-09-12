import { findCustomerBySlug } from "../db/repositories/customers.js";
import {
  cancelScheduledPost,
  createScheduledPost,
  listScheduledPostsForCustomer,
} from "../db/repositories/scheduled-posts.js";
import type { ToolInvocationResult } from "../domain/schemas.js";
import type { LoadedConnector } from "../registry/index.js";
import type { CatalogEntry } from "../registry/catalog.js";

/**
 * §予約投稿: AIエージェントが「未来の時刻に実行するツール呼び出し」を登録・閲覧・取消するための
 * vaixio.* メタツール。実行自体は interfaces/scheduler/scheduled-posts-job.ts が担う
 * (このファイルはPostgresへの読み書きのみ。1ファイル1責務、§7)。
 *
 * customers/<name>/config.yaml の projection と違い、scheduled_posts は Postgres 自体が
 * 唯一の真実の源。DATABASE_URL 未設定の環境では明示的にエラーを返す(黙って失敗させない)。
 */
export function buildScheduledPostsTools(connectors: LoadedConnector[]): CatalogEntry[] {
  return [scheduleTool(connectors), scheduleListTool(), scheduleCancelTool()];
}

function ok(data: unknown): ToolInvocationResult {
  return { ok: true, data };
}

function scheduleTool(connectors: LoadedConnector[]): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.post.schedule",
      description: "指定したツール呼び出しを未来の時刻に予約する。実行時刻になったら自動でRouter経由で実行される",
      destructive: true,
      inputSchema: {
        type: "object",
        properties: {
          tool_name: { type: "string", description: "予約実行したいツール名(例: instagram.post.create)" },
          args: { type: "object", description: "そのツールに渡す引数" },
          scheduled_at: { type: "string", description: "実行時刻(ISO8601、未来の日時)" },
          dry_run: { type: "boolean", description: "destructive:true のため必須。trueなら登録せずプレビューのみ返す" },
        },
        required: ["tool_name", "args", "scheduled_at"],
      },
    },
    invoke: async (args, ctx) => {
      if (!isRecord(args) || typeof args.tool_name !== "string" || !isRecord(args.args) || typeof args.scheduled_at !== "string") {
        return invalidInput("tool_name(string), args(object), scheduled_at(string)を指定してください");
      }
      if (args.tool_name.startsWith("vaixio.")) {
        return invalidInput("vaixio.* の診断ツール自体は予約できません");
      }
      const knownToolNames = new Set(connectors.flatMap((c) => c.manifest.tools.map((t) => t.name)));
      if (!knownToolNames.has(args.tool_name)) {
        return invalidInput(`unknown tool: ${args.tool_name}`, "connectors/ 配下に存在するツール名を指定してください");
      }
      const scheduledAt = new Date(args.scheduled_at);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        return invalidInput("scheduled_at は未来の日時をISO8601形式で指定してください");
      }

      if (args.dry_run) {
        return ok({ dry_run: true, would_schedule: { tool_name: args.tool_name, args: args.args, scheduled_at: scheduledAt.toISOString() } });
      }

      return withDb(async () => {
        const customer = await findCustomerBySlug(ctx.customer);
        if (!customer) return invalidInput(`unknown customer: ${ctx.customer}`);
        const row = await createScheduledPost({
          customerId: customer.id,
          toolName: args.tool_name as string,
          args: args.args,
          scheduledAt,
        });
        return ok({ id: row.id, tool_name: row.toolName, scheduled_at: row.scheduledAt, status: row.status });
      });
    },
  };
}

function scheduleListTool(): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.post.schedule.list",
      description: "自分(呼び出し元顧客)の予約投稿一覧を、予約時刻の昇順で返す",
      destructive: false,
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    invoke: async (_args, ctx) => {
      return withDb(async () => {
        const customer = await findCustomerBySlug(ctx.customer);
        if (!customer) return invalidInput(`unknown customer: ${ctx.customer}`);
        const rows = await listScheduledPostsForCustomer(customer.id);
        return ok({
          scheduled_posts: rows.map((r) => ({
            id: r.id,
            tool_name: r.toolName,
            args: r.args,
            scheduled_at: r.scheduledAt,
            status: r.status,
            published_at: r.publishedAt,
            error_message: r.errorMessage,
          })),
        });
      });
    },
  };
}

function scheduleCancelTool(): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.post.schedule.cancel",
      description: "自分(呼び出し元顧客)の予約投稿のうち、まだ実行前(pending)のものを取り消す",
      destructive: false,
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "vaixio.post.schedule.list で取得したid" } },
        required: ["id"],
      },
    },
    invoke: async (args, ctx) => {
      if (!isRecord(args) || typeof args.id !== "string") return invalidInput("id(string)を指定してください");

      return withDb(async () => {
        const customer = await findCustomerBySlug(ctx.customer);
        if (!customer) return invalidInput(`unknown customer: ${ctx.customer}`);
        const cancelled = await cancelScheduledPost(args.id as string, customer.id);
        if (!cancelled) {
          return invalidInput(
            `cancellable scheduled post not found: ${args.id}`,
            "既に実行済み/取消済み、または他の顧客の予約IDの可能性があります",
          );
        }
        return ok({ cancelled: true, id: args.id });
      });
    },
  };
}

async function withDb(fn: () => Promise<ToolInvocationResult>): Promise<ToolInvocationResult> {
  try {
    return await fn();
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "UPSTREAM_DOWN",
        message: err instanceof Error ? err.message : String(err),
        retriable: true,
        hint: "予約投稿機能にはPostgres(DATABASE_URL)が必要です。設定と疎通を確認してください",
      },
    };
  }
}

function invalidInput(message: string, hint = "inputSchemaと照合してください"): ToolInvocationResult {
  return { ok: false, error: { code: "INVALID_INPUT", message, retriable: false, hint } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
