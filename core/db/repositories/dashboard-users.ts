import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDb } from "../client.js";
import * as schema from "../schema.js";

const { dashboardUsers } = schema;

export interface DashboardUserRecord {
  id: string;
  customerId: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
}

export async function createDashboardUser(
  input: { customerId: string; email: string; passwordHash: string },
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<DashboardUserRecord> {
  const [row] = await db.insert(dashboardUsers).values(input).returning();
  return row;
}

export async function findDashboardUserByEmail(
  email: string,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<DashboardUserRecord | undefined> {
  const [row] = await db.select().from(dashboardUsers).where(eq(dashboardUsers.email, email)).limit(1);
  return row;
}

export async function findDashboardUserById(
  id: string,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<DashboardUserRecord | undefined> {
  const [row] = await db.select().from(dashboardUsers).where(eq(dashboardUsers.id, id)).limit(1);
  return row;
}

export async function touchLastLogin(id: string, db: NodePgDatabase<typeof schema> = getDb()): Promise<void> {
  await db.update(dashboardUsers).set({ lastLoginAt: new Date() }).where(eq(dashboardUsers.id, id));
}
