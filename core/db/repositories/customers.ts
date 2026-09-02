import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDb } from "../client.js";
import * as schema from "../schema.js";

const { customers } = schema;

export interface CustomerRecord {
  id: string;
  slug: string;
  displayName: string | null;
}

/**
 * customers/<name>/config.yaml を読むたびに呼ばれる upsert。
 * このテーブルはFK土台の射影であり、router/registryの真実の源ではない(§A)。
 */
export async function upsertCustomer(
  slug: string,
  displayName: string | null = null,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<CustomerRecord> {
  const [row] = await db
    .insert(customers)
    .values({ slug, displayName })
    .onConflictDoUpdate({
      target: customers.slug,
      set: { displayName, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function findCustomerBySlug(
  slug: string,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<CustomerRecord | undefined> {
  const [row] = await db.select().from(customers).where(eq(customers.slug, slug)).limit(1);
  return row;
}

export async function findCustomerById(
  id: string,
  db: NodePgDatabase<typeof schema> = getDb(),
): Promise<CustomerRecord | undefined> {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return row;
}
