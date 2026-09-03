import type { ToolInvocationResult } from "../domain/schemas.js";

/**
 * コネクタが core に対して実装するポート。
 * connector → core(ports/domain) の一方向のみ許可（§8.1）。
 * ツール一覧・スキーマは manifest.json（registry が読む）が真実の源であり、
 * このポート自体はツールの実行方法のみを規定する。
 */
export interface Connector {
  /** ツール実行。境界での zod 検証は router 側で実施済みの args を受け取る。 */
  invoke(toolName: string, args: unknown, ctx: ConnectorContext): Promise<ToolInvocationResult>;

  /** §6.4 vaixio.health が呼び出す単体ヘルスチェック。 */
  healthCheck(): Promise<HealthStatus>;
}

export interface ConnectorContext {
  traceId: string;
  customer: string;
  dryRun: boolean;
}

export interface HealthStatus {
  platform: string;
  healthy: boolean;
  detail?: string;
}
