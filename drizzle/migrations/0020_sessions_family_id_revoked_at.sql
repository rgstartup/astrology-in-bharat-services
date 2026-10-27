ALTER TABLE "auth"."sessions"
  ADD COLUMN IF NOT EXISTS "family_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;--> statement-breakpoint

UPDATE "auth"."sessions"
  SET "family_id" = "id"
  WHERE "family_id" IS NULL;
