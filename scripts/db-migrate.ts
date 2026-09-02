import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * §「明示的なデプロイ手順」: コンテナ起動時に暗黙実行せず、
 * `npm run db:migrate` を人が(またはデプロイスクリプトが)明示的に叩く。
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    process.stderr.write("DATABASE_URL が未設定です\n");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "core/db/migrations" });
  await pool.end();
  process.stdout.write("db:migrate 完了\n");
}

main().catch((err) => {
  process.stderr.write(`db:migrate failed: ${String(err)}\n`);
  process.exit(1);
});
