import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Express } from "express";
import { verifyBearerToken } from "../../core/auth-vault/index.js";
import { loadCustomerConfig } from "../../core/registry/customer-config.js";
import type { Router } from "../../core/router/index.js";
import { generateTraceId } from "../../core/telemetry/trace.js";

/**
 * §2/§5: 主入口。POST /mcp/:customer が「顧客専用MCPサーバー」の実体。
 * リクエストごとに Server/Transport をステートレスに生成し、
 * customer スコープでフィルタしたツールカタログのみを見せる。
 */
export function mountMcp(app: Express, router: Router): void {
  app.post("/mcp/:customer", async (req, res) => {
    const customer = req.params.customer;
    const config = await loadCustomerConfig(customer);
    if (!config) {
      res.status(404).json(jsonRpcError(-32001, `unknown customer: ${customer}`));
      return;
    }

    const token = extractBearerToken(req.header("authorization"));
    if (!verifyBearerToken(customer, token)) {
      res.status(401).json(jsonRpcError(-32002, "unauthorized"));
      return;
    }

    const server = new Server({ name: `vaixio:${customer}`, version: "0.1.0" }, { capabilities: { tools: {} } });

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await router.getCatalogFor(customer);
      return {
        tools: tools.map((entry) => ({
          name: entry.definition.name,
          description: entry.definition.description,
          inputSchema: entry.definition.inputSchema as { type: "object"; [k: string]: unknown },
        })),
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const traceId = generateTraceId();
      const result = await router.handleToolCall({
        toolName: request.params.name,
        args: request.params.arguments ?? {},
        customer,
        traceId,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result.ok ? result.data : result.error) }],
        isError: !result.ok,
      };
    });

    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch {
      if (!res.headersSent) res.status(500).json(jsonRpcError(-32603, "internal error"));
    }
  });

  app.get("/mcp/:customer", (_req, res) => {
    res.status(405).json(jsonRpcError(-32000, "Method not allowed."));
  });
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length);
}

function jsonRpcError(code: number, message: string) {
  return { jsonrpc: "2.0", error: { code, message }, id: null };
}
