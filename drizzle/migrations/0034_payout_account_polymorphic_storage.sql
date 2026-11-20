-- Rename payout_provider_accounts → payout_provider_configs (table, enum, index, FK constraints)
ALTER TABLE "payments"."payout_provider_accounts" RENAME TO "payout_provider_configs";--> statement-breakpoint

ALTER TYPE "payments"."payout_provider_account_status_enum" RENAME TO "payout_provider_config_status_enum";--> statement-breakpoint

ALTER INDEX "payout_provider_accounts_provider_environment_idx" RENAME TO "payout_provider_configs_provider_environment_idx";--> statement-breakpoint

ALTER TABLE "payments"."payout_account_references" RENAME CONSTRAINT "payout_account_references_payout_provider_account_id_payout_provider_accounts_id_fk" TO "payout_account_references_payout_provider_account_id_payout_provider_configs_id_fk";--> statement-breakpoint
ALTER TABLE "payments"."payout_accounts" RENAME CONSTRAINT "payout_accounts_payout_provider_account_id_payout_provider_accounts_id_fk" TO "payout_accounts_payout_provider_account_id_payout_provider_configs_id_fk";--> statement-breakpoint
ALTER TABLE "payments"."payout_onboardings" RENAME CONSTRAINT "payout_onboardings_payout_provider_account_id_payout_provider_accounts_id_fk" TO "payout_onboardings_payout_provider_account_id_payout_provider_configs_id_fk";--> statement-breakpoint
ALTER TABLE "payments"."payout_webhook_events" RENAME CONSTRAINT "payout_webhook_events_payout_provider_account_id_payout_provider_accounts_id_fk" TO "payout_webhook_events_payout_provider_account_id_payout_provider_configs_id_fk";--> statement-breakpoint
ALTER TABLE "payments"."payouts" RENAME CONSTRAINT "payouts_payout_provider_account_id_payout_provider_accounts_id_fk" TO "payouts_payout_provider_account_id_payout_provider_configs_id_fk";--> statement-breakpoint
ALTER TABLE "payments"."payout_provider_configs" RENAME CONSTRAINT "payout_provider_accounts_provider_id_providers_id_fk" TO "payout_provider_configs_provider_id_providers_id_fk";--> statement-breakpoint

-- Add polymorphic details + onboarding_status enum types
CREATE TYPE "payments"."payout_account_type_enum" AS ENUM('bank_account', 'vpa', 'wallet', 'card', 'other');--> statement-breakpoint
CREATE TYPE "payments"."payout_account_onboarding_status_enum" AS ENUM('PENDING', 'INITIATED', 'VALIDATED', 'FAILED');--> statement-breakpoint

-- Add new columns to payout_accounts
ALTER TABLE "payments"."payout_accounts" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "payments"."payout_accounts" ADD COLUMN "onboarding_status" "payments"."payout_account_onboarding_status_enum" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint

-- Convert account_type from text to enum
ALTER TABLE "payments"."payout_accounts" ALTER COLUMN "account_type" TYPE "payments"."payout_account_type_enum" USING "account_type"::"payments"."payout_account_type_enum";--> statement-breakpoint

-- Backfill details from old bank columns for bank_account rows
UPDATE "payments"."payout_accounts" SET "details" = jsonb_build_object(
  'account_number_masked', "account_number_masked",
  'bank_name', "bank_name",
  'ifsc', "ifsc"
) WHERE "account_type" = 'bank_account';--> statement-breakpoint

-- Backfill onboarding_status from existing status/verification_status
UPDATE "payments"."payout_accounts" SET "onboarding_status" = CASE
  WHEN "status" = 'active' AND "verification_status" = 'verified' THEN 'VALIDATED'
  ELSE 'PENDING'
END;--> statement-breakpoint

-- Drop old hardcoded bank columns
ALTER TABLE "payments"."payout_accounts" DROP COLUMN "account_number_masked";--> statement-breakpoint
ALTER TABLE "payments"."payout_accounts" DROP COLUMN "bank_name";--> statement-breakpoint
ALTER TABLE "payments"."payout_accounts" DROP COLUMN "ifsc";--> statement-breakpoint

-- Drop System 2 tables (consolidated into payout_accounts)
DROP TABLE IF EXISTS "expert"."expert_payout_platform_accounts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "payments"."payout_platform_accounts" CASCADE;--> statement-breakpoint
