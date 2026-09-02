import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDb } from "../client.js";
import * as schema from "../schema.js";

const { auditEvents } = schema;

export interface RecordAuditEventInput {
  customerId: string;
  toolName: string;
  argsDigest: string;
  result: string;
  dryRun: boolean;
  latencyMs: number;
  raw?: unknown;
}

/**
 * logs/audit/<customer>.jsonl のベストエフォート射影(§A)。
 * DB障害でRouterのレスポンスパスを壊してはいけないため、呼び出し側で必ずcatchすること
 * (この関数自体はエラーを飲み込まない。core/telemetry/audit.ts側で握りつぶす)。
 */
export async function recordAuditEvent(
  input: RecordAuditEventInput,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<void> {
  await db.insert(auditEvents).values({
    customerId: input.customerId,
    toolName: input.toolName,
    argsDigest: input.argsDigest,
    result: input.result,
    dryRun: input.dryRun,
    latencyMs: String(input.latencyMs),
    raw: input.raw,
  });
}

export async function listAuditEventsForCustomer(
  customerId: string,
  limit = 50,
  db: NodePgDatabase<typeof schema> = getDb(),
) {
  return db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.customerId, customerId))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(limit);
}
