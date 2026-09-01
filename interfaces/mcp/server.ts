import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { loadConnectors } from "../../core/registry/index.js";
import { Router } from "../../core/router/index.js";
import { mountRest } from "../rest/mount.js";
import { mountMcp } from "./mount.js";

/**
 * エントリーポイント。§2の主入口(MCP)・副入口(REST)を同一プロセスで起動する。
 * 実体は interfaces/mcp/mount.ts と interfaces/rest/mount.ts（§10: MCP仕様変化はここに隔離）。
 */
async function main(): Promise<void> {
  const connectors = await loadConnectors();
  const router = new Router(connectors);

  const host = process.env.MUSUBI_HOST ?? "127.0.0.1";
  const allowedHosts = process.env.MUSUBI_ALLOWED_HOSTS?.split(",").map((h) => h.trim());
  const app = createMcpExpressApp({ host, allowedHosts });

  mountMcp(app, router);
  mountRest(app, router);

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, host);
}

main().catch((err) => {
  process.stderr.write(`musubi server failed to start: ${String(err)}\n`);
  process.exit(1);
});
