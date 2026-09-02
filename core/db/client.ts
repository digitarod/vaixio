import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

let db: NodePgDatabase<typeof schema> | undefined;
let pool: Pool | undefined;

/**
 * 単一のdrizzleインスタンス。DATABASE_URLは顧客ごとの秘密ではなくインフラ設定なので
 * core/auth-vaultは経由しない。MCP/REST/OAuthの既存機能はDB無しでも動くべきなので、
 * 遅延初期化にしてダッシュボード機能を使わない限りDB接続を要求しない。
 */
export function getDb(): NodePgDatabase<typeof schema> {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL が未設定です（ダッシュボード機能にはPostgresが必要）");
    }
    pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  }
  return db;
}

/** テストの後片付け・プロセス終了処理用。接続していなければ何もしない。 */
export async function closeDb(): Promise<void> {
  await pool?.end();
  db = undefined;
  pool = undefined;
}
