import type { LoadedConnector } from "../registry/index.js";
import type { CatalogEntry } from "../registry/catalog.js";
import { flightRecorder } from "../telemetry/flight-recorder.js";
import { readEntriesByTraceId } from "../telemetry/logger.js";
import { circuitBreakers } from "../resilience/circuit-breaker.js";
import { classifyError } from "../resilience/error-taxonomy.js";
import type { ToolInvocationResult } from "../domain/schemas.js";
import type { ConnectorContext } from "../ports/connector.js";

export interface DiagnosticsDeps {
  connectors: LoadedConnector[];
  /** replay 用に router の実行経路を再利用する（循環 import を避けるための注入）。 */
  invoke: (toolName: string, args: unknown, ctx: ConnectorContext) => Promise<ToolInvocationResult>;
}

/**
 * §6.4: ハブ自身のデバッグ用ツールを管理者スコープで公開する。
 * Claude Code / Hermes Agent がハブに聞くだけで障害調査できる状態にする。
 */
export function buildDiagnosticTools(deps: DiagnosticsDeps): CatalogEntry[] {
  return [
    healthTool(deps),
    errorsRecentTool(),
    traceGetTool(),
    replayTool(deps),
    connectorSmokeTool(deps),
  ];
}

function ok(data: unknown): ToolInvocationResult {
  return { ok: true, data };
}

function healthTool(deps: DiagnosticsDeps): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.health",
      description: "全コネクタの healthCheck を一括実行し、ハブ自身の稼働状態も含めて返す",
      destructive: false,
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    invoke: async () => {
      const connectors = await Promise.all(
        deps.connectors.map(async (c) => {
          try {
            return await c.instance.healthCheck();
          } catch (err) {
            return { platform: c.platform, healthy: false, detail: classifyError(err, { platform: c.platform }).message };
          }
        }),
      );
      return ok({
        hub: "healthy",
        connectorCount: deps.connectors.length,
        connectors,
        circuitBreakers: circuitBreakers.snapshot(),
      });
    },
  };
}

function errorsRecentTool(): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.errors.recent",
      description: "直近エラー一覧を error_code 別集計つきで返す",
      destructive: false,
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number", description: "取得件数(既定20)" } },
        required: [],
      },
    },
    invoke: async (args) => {
      const limit = isRecord(args) && typeof args.limit === "number" ? args.limit : 20;
      return ok({
        errors: flightRecorder.recentErrors(limit),
        countsByCode: flightRecorder.errorCounts(),
      });
    },
  };
}

function traceGetTool(): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.trace.get",
      description: "trace_id を指定して該当リクエストの全ログを取得する",
      destructive: false,
      inputSchema: {
        type: "object",
        properties: { trace_id: { type: "string" } },
        required: ["trace_id"],
      },
    },
    invoke: async (args) => {
      if (!isRecord(args) || typeof args.trace_id !== "string") {
        return {
          ok: false,
          error: { code: "INVALID_INPUT", message: "trace_id is required", retriable: false, hint: "trace_id(string)を指定してください" },
        };
      }
      const [logLines, flightRecord] = await Promise.all([
        readEntriesByTraceId(args.trace_id),
        Promise.resolve(flightRecorder.getByTraceId(args.trace_id)),
      ]);
      return ok({ trace_id: args.trace_id, logLines, flightRecord });
    },
  };
}

function replayTool(deps: DiagnosticsDeps): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.replay",
      description: "フライトレコーダの記録を dry-run で再実行する",
      destructive: false,
      inputSchema: {
        type: "object",
        properties: { trace_id: { type: "string" } },
        required: ["trace_id"],
      },
    },
    invoke: async (args, ctx) => {
      if (!isRecord(args) || typeof args.trace_id !== "string") {
        return {
          ok: false,
          error: { code: "INVALID_INPUT", message: "trace_id is required", retriable: false, hint: "trace_id(string)を指定してください" },
        };
      }
      const record = flightRecorder.getByTraceId(args.trace_id);
      if (!record) {
        return {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: `no flight record for ${args.trace_id}`,
            retriable: false,
            hint: "フライトレコーダのリングバッファから既に追い出されている可能性があります",
          },
        };
      }
      return deps.invoke(record.tool, record.args, { ...ctx, dryRun: true });
    },
  };
}

function connectorSmokeTool(deps: DiagnosticsDeps): CatalogEntry {
  return {
    platform: "vaixio",
    definition: {
      name: "vaixio.connector.smoke",
      description: "指定コネクタの実API疎通テストを実行する",
      destructive: false,
      inputSchema: {
        type: "object",
        properties: { platform: { type: "string" } },
        required: ["platform"],
      },
    },
    invoke: async (args) => {
      if (!isRecord(args) || typeof args.platform !== "string") {
        return {
          ok: false,
          error: { code: "INVALID_INPUT", message: "platform is required", retriable: false, hint: "platform(string)を指定してください" },
        };
      }
      const connector = deps.connectors.find((c) => c.platform === args.platform);
      if (!connector) {
        return {
          ok: false,
          error: {
            code: "NOT_ALLOWED",
            message: `unknown connector: ${args.platform}`,
            retriable: false,
            hint: "connectors/ 配下に存在するコネクタ名を指定してください",
          },
        };
      }
      try {
        return ok(await connector.instance.healthCheck());
      } catch (err) {
        return { ok: false, error: classifyError(err, { platform: connector.platform }) };
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
