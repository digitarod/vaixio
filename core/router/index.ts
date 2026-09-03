import { Ajv, type ValidateFunction } from "ajv";
import { buildDiagnosticTools } from "../diagnostics/tools.js";
import type { ToolError, ToolInvocationResult } from "../domain/schemas.js";
import type { ConnectorContext } from "../ports/connector.js";
import { loadCustomerConfig } from "../registry/customer-config.js";
import { buildCatalogIndex, type CatalogEntry } from "../registry/catalog.js";
import type { LoadedConnector } from "../registry/index.js";
import { circuitBreakers } from "../resilience/circuit-breaker.js";
import { classifyError } from "../resilience/error-taxonomy.js";
import { digestArgs, recordAudit } from "../telemetry/audit.js";
import { flightRecorder } from "../telemetry/flight-recorder.js";
import { log } from "../telemetry/logger.js";

const ajv = new Ajv({ allErrors: true, strict: false });

export interface HandleToolCallOptions {
  toolName: string;
  args: unknown;
  customer: string;
  traceId: string;
  /** vaixio.replay から強制的に dry-run させるための注入。通常呼び出しでは未指定。 */
  forceDryRun?: boolean;
}

/**
 * §2/§6: tool名 → connector 解決・実行の単一経路。
 * allowed_tools・destructive dry_run・境界検証・taxonomy・trace・監査ログをここに集約する。
 */
export class Router {
  private readonly catalogIndex: Map<string, CatalogEntry>;
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(connectors: LoadedConnector[]) {
    const connectorEntries: CatalogEntry[] = connectors.flatMap((c) =>
      c.manifest.tools.map((tool) => ({
        platform: c.platform,
        definition: tool,
        invoke: (args: unknown, ctx: ConnectorContext) => c.instance.invoke(tool.name, args, ctx),
      })),
    );

    const diagnosticEntries = buildDiagnosticTools({
      connectors,
      invoke: (toolName, args, ctx) => this.invokeEntry(toolName, args, ctx),
    });

    this.catalogIndex = buildCatalogIndex([...connectorEntries, ...diagnosticEntries]);
  }

  /** §4.2 docs/ 生成用: 顧客スコープを問わない全ツール一覧。 */
  listAll(): CatalogEntry[] {
    return [...this.catalogIndex.values()];
  }

  /** MCP tools/list 用: 顧客の allowed_tools でフィルタしたカタログ（§5: 許可外は存在ごと隠す）。 */
  async getCatalogFor(customer: string): Promise<CatalogEntry[]> {
    const config = await loadCustomerConfig(customer);
    if (!config) return [];
    return config.allowed_tools
      .map((name) => this.catalogIndex.get(name))
      .filter((entry): entry is CatalogEntry => entry !== undefined);
  }

  async handleToolCall(opts: HandleToolCallOptions): Promise<ToolInvocationResult> {
    const { toolName, args, customer, traceId, forceDryRun } = opts;
    const start = Date.now();

    const config = await loadCustomerConfig(customer);
    if (!config || !config.allowed_tools.includes(toolName)) {
      return this.finish(opts, start, {
        ok: false,
        error: {
          code: "NOT_ALLOWED",
          message: `tool not allowed for customer: ${toolName}`,
          retriable: false,
          hint: `customers/${customer}/config.yaml の allowed_tools に ${toolName} を追加してください`,
        },
      });
    }

    const entry = this.catalogIndex.get(toolName);
    if (!entry) {
      return this.finish(opts, start, {
        ok: false,
        error: {
          code: "NOT_ALLOWED",
          message: `unknown tool: ${toolName}`,
          retriable: false,
          hint: "registry にツールが存在しません。connectors/ の manifest.json を確認してください",
        },
      });
    }

    const breaker = circuitBreakers.for(entry.platform);
    if (!breaker.isCallAllowed()) {
      return this.finish(opts, start, {
        ok: false,
        error: {
          code: "UPSTREAM_DOWN",
          message: `connector degraded: ${entry.platform}`,
          retriable: true,
          hint: `vaixio.connector.smoke で ${entry.platform} の疎通を確認してください`,
        },
      });
    }

    const validationError = this.validate(entry, args);
    if (validationError) return this.finish(opts, start, { ok: false, error: validationError });

    let dryRun = forceDryRun ?? false;
    if (forceDryRun === undefined && entry.definition.destructive && config.confirm_policy.destructive === "dry_run_first") {
      const dryRunArg = isRecord(args) ? args.dry_run : undefined;
      if (typeof dryRunArg !== "boolean") {
        return this.finish(opts, start, {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "destructive tool requires dry_run",
            retriable: false,
            hint: "破壊的操作です。まず dry_run:true で呼び出し、内容を確認してから dry_run:false で確定してください",
          },
        });
      }
      dryRun = dryRunArg;
    }

    try {
      const result = await entry.invoke(args, { traceId, customer, dryRun });
      if (result.ok) breaker.recordSuccess();
      else breaker.recordFailure();
      return this.finish(opts, start, result, dryRun);
    } catch (err) {
      breaker.recordFailure();
      const error = classifyError(err, { platform: entry.platform });
      return this.finish(opts, start, { ok: false, error }, dryRun);
    }
  }

  private invokeEntry(toolName: string, args: unknown, ctx: ConnectorContext): Promise<ToolInvocationResult> {
    return this.handleToolCall({
      toolName,
      args,
      customer: ctx.customer,
      traceId: ctx.traceId,
      forceDryRun: ctx.dryRun,
    });
  }

  private validate(entry: CatalogEntry, args: unknown): ToolError | undefined {
    let validator = this.validators.get(entry.definition.name);
    if (!validator) {
      validator = ajv.compile(entry.definition.inputSchema);
      this.validators.set(entry.definition.name, validator);
    }
    if (validator(args)) return undefined;
    return {
      code: "INVALID_INPUT",
      message: ajv.errorsText(validator.errors),
      retriable: false,
      hint: "inputSchema と照合してください（vaixio.trace.get で送信した args を確認できます）",
    };
  }

  private async finish(
    opts: HandleToolCallOptions,
    start: number,
    result: ToolInvocationResult,
    dryRun = false,
  ): Promise<ToolInvocationResult> {
    const latency_ms = Date.now() - start;
    const { toolName, args, customer, traceId } = opts;

    await log({
      trace_id: traceId,
      customer,
      tool: toolName,
      phase: "tool_call",
      latency_ms,
      error_code: result.ok ? null : result.error.code,
    });

    flightRecorder.record({
      traceId,
      customer,
      tool: toolName,
      args,
      ts: new Date().toISOString(),
      latencyMs: latency_ms,
      result: result.ok ? "ok" : "error",
      errorCode: result.ok ? undefined : result.error.code,
      errorMessage: result.ok ? undefined : result.error.message,
    });

    const config = await loadCustomerConfig(customer);
    if (config?.audit) {
      await recordAudit({
        ts: new Date().toISOString(),
        customer,
        trace_id: traceId,
        tool: toolName,
        args_digest: digestArgs(args),
        result: result.ok ? "ok" : "error",
        latency_ms,
        dry_run: dryRun,
      });
    }

    return result;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
