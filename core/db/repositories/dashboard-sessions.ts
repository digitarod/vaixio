import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDb } from "../client.js";
import * as schema from "../schema.js";

const { dashboardSessions } = schema;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30日

export interface DashboardSessionRecord {
  id: string;
  dashboardUserId: string;
  expiresAt: Date;
}

export async function createDashboardSession(
  input: { dashboardUserId: string; userAgent?: string; ip?: string },
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<DashboardSessionRecord> {
  const [row] = await db
    .insert(dashboardSessions)
    .values({ ...input, expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .returning();
  return row;
}

/** 期限切れなら undefined を返す(呼び出し側で改めて削除する必要はない。期限切れ行はTTLで放置しても実害がない)。 */
export async function findValidSession(
  id: string,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<DashboardSessionRecord | undefined> {
  const [row] = await db.select().from(dashboardSessions).where(eq(dashboardSessions.id, id)).limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return undefined;
  return row;
}

export async function deleteSession(id: string, db: NodePgDatabase<typeof schema> = getDb()): Promise<void> {
  await db.delete(dashboardSessions).where(eq(dashboardSessions.id, id));
}
