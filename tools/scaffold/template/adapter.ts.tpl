import type { Connector, ConnectorContext, HealthStatus } from "../../core/ports/connector.js";
import type { ToolInvocationResult } from "../../core/domain/schemas.js";

/**
 * __PLATFORM__ コネクタ。core への依存のみ許可（他コネクタ・interfaces の import 禁止、§8.1）。
 * ツール一覧・スキーマは manifest.json が真実の源。ここには実行方法のみを書く。
 */
const adapter: Connector = {
  async invoke(toolName: string, args: unknown, _ctx: ConnectorContext): Promise<ToolInvocationResult> {
    switch (toolName) {
      case "__PLATFORM__.example.action":
        // TODO: 実装する。外部API呼び出しの応答は境界で必ず zod parse すること（§8.4）。
        return { ok: true, data: { received: args } };
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
    // TODO: 実APIへの軽量な疎通確認に置き換える
    return { platform: "__PLATFORM__", healthy: true };
  },
};

export default adapter;
