import type { Express } from "express";
import { verifyBearerToken } from "../../core/auth-vault/index.js";
import type { ErrorCode } from "../../core/domain/schemas.js";
import { loadCustomerConfig } from "../../core/registry/customer-config.js";
import type { Router } from "../../core/router/index.js";
import { generateTraceId } from "../../core/telemetry/trace.js";

const ERROR_STATUS: Record<ErrorCode, number> = {
  AUTH_EXPIRED: 401,
  RATE_LIMITED: 429,
  INVALID_INPUT: 400,
  UPSTREAM_DOWN: 503,
  NOT_ALLOWED: 403,
  UNKNOWN: 500,
};

/**
 * §2/§4.2: 開発者向け副入口。registry/router に委譲するだけで、
 * MCP と全く同じ許可リスト・dry_run・監査ログの規約に従う。
 */
export function mountRest(app: Express, router: Router): void {
  app.get("/v1/customers/:customer/tools", async (req, res) => {
    const customer = req.params.customer;
    if (!(await authorize(customer, req.header("authorization")))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const tools = await router.getCatalogFor(customer);
    res.json({
      tools: tools.map((entry) => ({
        name: entry.definition.name,
        description: entry.definition.description,
        inputSchema: entry.definition.inputSchema,
        destructive: entry.definition.destructive,
      })),
    });
  });

  app.post("/v1/customers/:customer/tools/:toolName", async (req, res) => {
    const { customer, toolName } = req.params;
    if (!(await authorize(customer, req.header("authorization")))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const traceId = generateTraceId();
    const result = await router.handleToolCall({
      toolName,
      args: req.body ?? {},
      customer,
      traceId,
    });

    res.setHeader("X-Trace-Id", traceId);
    if (result.ok) {
      res.json({ ok: true, data: result.data, trace_id: traceId });
    } else {
      res.status(ERROR_STATUS[result.error.code]).json({ ok: false, error: result.error, trace_id: traceId });
    }
  });
}

async function authorize(customer: string, authHeader: string | undefined): Promise<boolean> {
  const config = await loadCustomerConfig(customer);
  if (!config) return false;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  return verifyBearerToken(customer, token);
}
