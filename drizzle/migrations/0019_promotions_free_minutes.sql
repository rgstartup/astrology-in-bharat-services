/*
  Versioned Promotions, Financial Subsidies & Free Consultation Minutes (v2)
  - promotions schema: versioned definitions, per-client wallet, granted
    benefits (seconds) and an audit ledger.
  - consultation_billings: explicit settlement breakdown columns.
  - Seed: WELCOME_CHAT_5 (300 chat seconds granted at client registration).
*/
CREATE SCHEMA IF NOT EXISTS "promotions";--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "promotions"."promotion_definitions" (
  "id" serial PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'active',
  "benefit_type" text NOT NULL DEFAULT 'chat_seconds',
  "benefit_quantity" integer NOT NULL DEFAULT 300,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "promotions"."promotion_wallets" (
  "id" serial PRIMARY KEY,
  "client_id" integer NOT NULL UNIQUE REFERENCES "client"."account"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "promotions"."promotion_benefits" (
  "id" serial PRIMARY KEY,
  "wallet_id" integer NOT NULL REFERENCES "promotions"."promotion_wallets"("id") ON DELETE CASCADE,
  "definition_id" integer NOT NULL REFERENCES "promotions"."promotion_definitions"("id"),
  "client_id" integer NOT NULL REFERENCES "client"."account"("id") ON DELETE CASCADE,
  "benefit_type" text NOT NULL DEFAULT 'chat_seconds',
  "granted_seconds" integer NOT NULL,
  "consumed_seconds" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "promotions"."promotion_benefit_ledger" (
  "id" serial PRIMARY KEY,
  "benefit_id" integer NOT NULL REFERENCES "promotions"."promotion_benefits"("id") ON DELETE CASCADE,
  "consultation_id" integer REFERENCES "consultations"."consultations"("id") ON DELETE SET NULL,
  "delta_seconds" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE "consultations"."consultation_billings"
  ADD COLUMN IF NOT EXISTS "promotional_discount" numeric(12, 2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings"
  ADD COLUMN IF NOT EXISTS "provider_contribution" numeric(12, 2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings"
  ADD COLUMN IF NOT EXISTS "platform_subsidy" numeric(12, 2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings"
  ADD COLUMN IF NOT EXISTS "payable_amount" numeric(12, 2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings"
  ADD COLUMN IF NOT EXISTS "wallet_deduction" numeric(12, 2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings"
  ADD COLUMN IF NOT EXISTS "consumed_promotional_seconds" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings"
  ADD COLUMN IF NOT EXISTS "promotion_benefit_id" integer REFERENCES "promotions"."promotion_benefits"("id") ON DELETE SET NULL;--> statement-breakpoint

INSERT INTO "promotions"."promotion_definitions"
  ("code", "name", "version", "status", "benefit_type", "benefit_quantity")
VALUES
  ('WELCOME_CHAT_5', 'Welcome chat: 5 free minutes', 1, 'active', 'chat_seconds', 300)
ON CONFLICT ("code") DO NOTHING;
