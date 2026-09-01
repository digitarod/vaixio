import { randomBytes } from "node:crypto";

/** §6.1 入口(MCP/REST)で発行する trace_id。 */
export function generateTraceId(): string {
  return `tr_${randomBytes(8).toString("hex")}`;
}
