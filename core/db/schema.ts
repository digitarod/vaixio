import { boolean, jsonb, pgTable, text, timestamp, uuid, bigserial } from "drizzle-orm/pg-core";

/**
 * customers/<name>/config.yaml の射影（projection）。YAMLが今も真実の源であり、
 * ここは core/registry/customer-config.ts が読み込むたびに upsert するだけの
 * ダッシュボード用の参照テーブル（外部キーの土台）。router/registryはこのテーブルを読まない。
 */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 顧客側の人間ログイン（MCP/REST用Bearerトークンとは完全に別の信頼領域）。
 */
export const dashboardUsers = pgTable("dashboard_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  email: text("email").notNull().unique(),
  // Google専用アカウントはパスワードを持たない(specs/dashboard-google-login.md)。
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

/** Cookieの値そのものがid。サーバーセッション方式（JWTではない）。 */
export const dashboardSessions = pgTable("dashboard_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  dashboardUserId: uuid("dashboard_user_id")
    .notNull()
    .references(() => dashboardUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
});

/**
 * logs/audit/<customer>.jsonl のベストエフォート射影。JSONLが真実の源のまま。
 * ダッシュボードの利用履歴表示はここだけを読む。
 */
export const auditEvents = pgTable("audit_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  toolName: text("tool_name").notNull(),
  argsDigest: text("args_digest").notNull(),
  result: text("result").notNull(),
  dryRun: boolean("dry_run").notNull().default(false),
  latencyMs: text("latency_ms"),
  raw: jsonb("raw"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});
