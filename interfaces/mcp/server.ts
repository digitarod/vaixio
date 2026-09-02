import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { loadConnectors } from "../../core/registry/index.js";
import { preloadAllCustomerConfigs } from "../../core/registry/customer-config.js";
import { Router } from "../../core/router/index.js";
import { mountDashboardApi } from "../dashboard-api/mount.js";
import { mountInstagramOAuth } from "../oauth/instagram-connect.js";
import { startInstagramTokenRefreshJob } from "../oauth/instagram-refresh-job.js";
import { mountRest } from "../rest/mount.js";
import { mountDashboardWeb } from "./mount-dashboard-web.js";
import { mountMcp } from "./mount.js";
import { parseAllowedHosts } from "./parse-allowed-hosts.js";

/**
 * エントリーポイント。§2の主入口(MCP)・副入口(REST)・OAuth連携用Webフローを同一プロセスで起動する。
 * 実体は interfaces/mcp/mount.ts, interfaces/rest/mount.ts, interfaces/oauth/*（§10: 仕様変化はここに隔離）。
 */
async function main(): Promise<void> {
  await preloadAllCustomerConfigs();
  const connectors = await loadConnectors();
  const router = new Router(connectors);

  const host = process.env.MUSUBI_HOST ?? "127.0.0.1";
  const app = createMcpExpressApp({ host, allowedHosts: parseAllowedHosts(process.env.MUSUBI_ALLOWED_HOSTS) });

  mountMcp(app, router);
  mountRest(app, router);
  mountInstagramOAuth(app);
  mountDashboardApi(app);
  mountDashboardWeb(app);
  startInstagramTokenRefreshJob();

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, host);
}

main().catch((err) => {
  process.stderr.write(`musubi server failed to start: ${String(err)}\n`);
  process.exit(1);
});
