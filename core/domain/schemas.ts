import { z } from "zod";

/**
 * §6.3 エラー分類（taxonomy）。外部APIの雑多なエラーは必ずこれに正規化してから返す。
 */
export const ErrorCode = z.enum([
  "AUTH_EXPIRED",
  "RATE_LIMITED",
  "INVALID_INPUT",
  "UPSTREAM_DOWN",
  "NOT_ALLOWED",
  "UNKNOWN",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ToolError = z.object({
  code: ErrorCode,
  message: z.string(),
  retriable: z.boolean(),
  hint: z.string(),
});
export type ToolError = z.infer<typeof ToolError>;

export const ToolDefinition = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  destructive: z.boolean().default(false),
});
export type ToolDefinition = z.infer<typeof ToolDefinition>;

export const ConnectorAuth = z.object({
  type: z.string(),
});
export type ConnectorAuth = z.infer<typeof ConnectorAuth>;

export const ConnectorManifest = z.object({
  platform: z.string(),
  version: z.string(),
  tools: z.array(ToolDefinition),
  auth: ConnectorAuth,
});
export type ConnectorManifest = z.infer<typeof ConnectorManifest>;

/**
 * connectors/<name>/manifest.json のオンディスク形式（§4.1）。
 * inputSchema はファイル参照。registry がこれを解決して {@link ConnectorManifest} に変換する。
 */
export const RawToolDefinition = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.string(),
  destructive: z.boolean().default(false),
});
export type RawToolDefinition = z.infer<typeof RawToolDefinition>;

export const RawConnectorManifest = z.object({
  platform: z.string(),
  version: z.string(),
  tools: z.array(RawToolDefinition),
  auth: ConnectorAuth,
});
export type RawConnectorManifest = z.infer<typeof RawConnectorManifest>;

/**
 * コネクタ呼び出しの結果。core と connector の境界 DTO。
 */
export const ToolInvocationResult = z.union([
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({ ok: z.literal(false), error: ToolError }),
]);
export type ToolInvocationResult = z.infer<typeof ToolInvocationResult>;

export const ConfirmPolicy = z.enum(["dry_run_first", "none"]);
export type ConfirmPolicy = z.infer<typeof ConfirmPolicy>;

/**
 * customers/<name>/config.yaml の形。顧客専用MCPサーバーの実体。
 */
export const CustomerConfig = z.object({
  customer: z.string(),
  mcp_path: z.string(),
  allowed_tools: z.array(z.string()),
  credentials: z.record(z.string(), z.string()).default({}),
  confirm_policy: z.object({
    destructive: ConfirmPolicy,
  }),
  audit: z.boolean().default(true),
});
export type CustomerConfig = z.infer<typeof CustomerConfig>;

/**
 * OAuthで顧客が自己連携したプラットフォームアカウントのトークン記録。
 * 顧客がGraph APIトークンを直接扱わずに済むよう、auth-vaultのtoken-storeが暗号化保存する。
 */
export const OAuthTokenRecord = z.object({
  platform: z.string(),
  customer: z.string(),
  accessToken: z.string(),
  accountId: z.string(),
  accountName: z.string().optional(),
  obtainedAt: z.string(),
  expiresAt: z.string().nullable(),
});
export type OAuthTokenRecord = z.infer<typeof OAuthTokenRecord>;

/**
 * §6.1 全リクエストに付与する trace 付き構造化ログの1行。
 */
export const LogEntry = z.object({
  ts: z.string(),
  trace_id: z.string(),
  customer: z.string().optional(),
  tool: z.string().optional(),
  phase: z.string(),
  latency_ms: z.number().optional(),
  error_code: ErrorCode.nullable().optional(),
  message: z.string().optional(),
});
export type LogEntry = z.infer<typeof LogEntry>;

/**
 * §5 監査ログ1行。「AIに何をさせたか」を顧客に提示できる形。
 */
export const AuditEntry = z.object({
  ts: z.string(),
  customer: z.string(),
  trace_id: z.string(),
  tool: z.string(),
  args_digest: z.string(),
  result: z.enum(["ok", "error"]),
  latency_ms: z.number(),
  dry_run: z.boolean(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;
