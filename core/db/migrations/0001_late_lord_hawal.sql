ALTER TABLE "dashboard_users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard_users" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "dashboard_users" ADD CONSTRAINT "dashboard_users_google_id_unique" UNIQUE("google_id");