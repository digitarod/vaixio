import { and, asc, eq, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDb } from "../client.js";
import * as schema from "../schema.js";

const { scheduledPosts, customers } = schema;

export interface CreateScheduledPostInput {
  customerId: string;
  toolName: string;
  args: unknown;
  scheduledAt: Date;
}

export interface DuePost {
  id: string;
  customerSlug: string;
  toolName: string;
  args: unknown;
}

export async function createScheduledPost(
  input: CreateScheduledPostInput,
  db: NodePgDatabase<typeof schema> = getDb(),
) {
  const [row] = await db
    .insert(scheduledPosts)
    .values({
      customerId: input.customerId,
      toolName: input.toolName,
      args: input.args,
      scheduledAt: input.scheduledAt,
    })
    .returning();
  return row;
}

export async function listScheduledPostsForCustomer(
  customerId: string,
  db: NodePgDatabase<typeof schema> = getDb(),
) {
  return db
    .select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.customerId, customerId))
    .orderBy(asc(scheduledPosts.scheduledAt));
}

/** interfaces/scheduler/scheduled-posts-job.ts が実行対象を探すために使う。customerのslugを含めて返す。 */
export async function findDuePosts(now: Date, db: NodePgDatabase<typeof schema> = getDb()): Promise<DuePost[]> {
  const rows = await db
    .select({
      id: scheduledPosts.id,
      customerSlug: customers.slug,
      toolName: scheduledPosts.toolName,
      args: scheduledPosts.args,
    })
    .from(scheduledPosts)
    .innerJoin(customers, eq(scheduledPosts.customerId, customers.id))
    .where(and(eq(scheduledPosts.status, "pending"), lte(scheduledPosts.scheduledAt, now)));
  return rows;
}

export async function markScheduledPostPublished(id: string, db: NodePgDatabase<typeof schema> = getDb()): Promise<void> {
  await db.update(scheduledPosts).set({ status: "published", publishedAt: new Date() }).where(eq(scheduledPosts.id, id));
}

export async function markScheduledPostFailed(
  id: string,
  errorMessage: string,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<void> {
  await db.update(scheduledPosts).set({ status: "failed", errorMessage }).where(eq(scheduledPosts.id, id));
}

/** pendingのものだけキャンセル可能。他人の予約をキャンセルできないようcustomerIdでも絞り込む。 */
export async function cancelScheduledPost(
  id: string,
  customerId: string,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<boolean> {
  const [row] = await db
    .update(scheduledPosts)
    .set({ status: "cancelled" })
    .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.customerId, customerId), eq(scheduledPosts.status, "pending")))
    .returning();
  return row !== undefined;
}
