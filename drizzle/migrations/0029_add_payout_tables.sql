CREATE TYPE "public"."payout_account_reference_type_enum" AS ENUM('contact', 'fund_account', 'beneficiary', 'connected_account', 'external_account', 'provider_customer', 'other');--> statement-breakpoint
CREATE TYPE "public"."payout_account_status_enum" AS ENUM('pending', 'active', 'restricted', 'suspended', 'rejected', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."payout_account_validation_status_enum" AS ENUM('PENDING', 'INITIATED', 'VALIDATED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."payout_onboarding_action_enum" AS ENUM('none', 'redirect', 'submit_details', 'verify', 'wait');--> statement-breakpoint
CREATE TYPE "public"."payout_onboarding_status_enum" AS ENUM('pending', 'in_progress', 'requires_action', 'submitted', 'under_review', 'completed', 'rejected', 'expired', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payout_provider_account_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."payout_status_enum" AS ENUM('created', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."payout_verification_status_enum" AS ENUM('not_started', 'pending', 'under_review', 'verified', 'rejected', 'requires_action');--> statement-breakpoint
CREATE TYPE "public"."payout_webhook_processing_status_enum" AS ENUM('received', 'verified', 'pending', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TABLE "expert"."expert_payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"partner_payout_account_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."expert_payout_platform_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"payout_platform_account_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."merchant_payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"payout_account_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."payout_account_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_account_id" integer NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"reference_type" "payout_account_reference_type_enum" NOT NULL,
	"provider_reference" text NOT NULL,
	"provider_metadata" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"status" "payout_account_status_enum" DEFAULT 'pending' NOT NULL,
	"verification_status" "payout_verification_status_enum" DEFAULT 'not_started' NOT NULL,
	"account_type" text DEFAULT 'bank_account' NOT NULL,
	"country_code" text DEFAULT 'IN' NOT NULL,
	"currency_code" text DEFAULT 'INR' NOT NULL,
	"display_name" text,
	"account_fingerprint" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"provider_metadata" json,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."payout_onboardings" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"status" "payout_onboarding_status_enum" DEFAULT 'pending' NOT NULL,
	"action_required" "payout_onboarding_action_enum" DEFAULT 'none' NOT NULL,
	"action_url" text,
	"provider_reference" text,
	"provider_metadata" json,
	"failure_code" text,
	"failure_message" text,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."payout_platform_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"platform_contact_id" text,
	"platform_fund_id" text,
	"account_type" text DEFAULT 'bank_account' NOT NULL,
	"bank_name" text,
	"account_number_masked" text,
	"ifsc" text,
	"vpa" text,
	"validation_status" "payout_account_validation_status_enum" DEFAULT 'PENDING' NOT NULL,
	"validation_id" text,
	"failure_reason" text,
	"metadata" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_platform_accounts_platform_fund_id_unique" UNIQUE("platform_fund_id")
);
--> statement-breakpoint
CREATE TABLE "payments"."payout_provider_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"environment" text DEFAULT 'test' NOT NULL,
	"country_code" text DEFAULT 'IN' NOT NULL,
	"currency_code" text DEFAULT 'INR' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"credentials_reference" text NOT NULL,
	"configuration" json,
	"status" "payout_provider_account_status_enum" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."payout_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"normalized_event_type" text,
	"payload" json,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processing_status" "payout_webhook_processing_status_enum" DEFAULT 'received' NOT NULL,
	"processing_attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"failure_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_account_id" integer NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency_code" text DEFAULT 'INR' NOT NULL,
	"status" "payout_status_enum" DEFAULT 'created' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_payout_reference" text,
	"failure_code" text,
	"failure_message" text,
	"initiated_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"metadata" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "promotions"."promotion_benefit_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"benefit_id" integer NOT NULL,
	"consultation_id" integer,
	"delta_seconds" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions"."promotion_benefits" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"definition_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"benefit_type" text DEFAULT 'chat_seconds' NOT NULL,
	"granted_seconds" integer NOT NULL,
	"consumed_seconds" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions"."promotion_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"benefit_type" text DEFAULT 'chat_seconds' NOT NULL,
	"benefit_quantity" integer DEFAULT 300 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promotions"."promotion_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_wallets_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "consultations"."quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"author" text,
	"source" text,
	"meaning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expert"."account" ALTER COLUMN "gender" SET DEFAULT 'male';--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD COLUMN "promotional_discount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD COLUMN "provider_contribution" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD COLUMN "platform_subsidy" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD COLUMN "payable_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD COLUMN "wallet_deduction" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD COLUMN "consumed_promotional_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD COLUMN "promotion_benefit_id" integer;--> statement-breakpoint
ALTER TABLE "expert"."account" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD COLUMN "family_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert"."expert_payout_accounts" ADD CONSTRAINT "expert_payout_accounts_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_payout_accounts" ADD CONSTRAINT "expert_payout_accounts_partner_payout_account_id_partner_payout_accounts_id_fk" FOREIGN KEY ("partner_payout_account_id") REFERENCES "payments"."partner_payout_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_payout_platform_accounts" ADD CONSTRAINT "expert_payout_platform_accounts_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_payout_platform_accounts" ADD CONSTRAINT "expert_payout_platform_accounts_payout_platform_account_id_payout_platform_accounts_id_fk" FOREIGN KEY ("payout_platform_account_id") REFERENCES "payments"."payout_platform_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."merchant_payout_accounts" ADD CONSTRAINT "merchant_payout_accounts_merchant_id_account_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "merchant"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."merchant_payout_accounts" ADD CONSTRAINT "merchant_payout_accounts_payout_account_id_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "payments"."payout_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payout_account_references" ADD CONSTRAINT "payout_account_references_payout_account_id_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "payments"."payout_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payout_account_references" ADD CONSTRAINT "payout_account_references_payout_provider_account_id_payout_provider_accounts_id_fk" FOREIGN KEY ("payout_provider_account_id") REFERENCES "payments"."payout_provider_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payout_accounts" ADD CONSTRAINT "payout_accounts_payout_provider_account_id_payout_provider_accounts_id_fk" FOREIGN KEY ("payout_provider_account_id") REFERENCES "payments"."payout_provider_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payout_onboardings" ADD CONSTRAINT "payout_onboardings_payout_provider_account_id_payout_provider_accounts_id_fk" FOREIGN KEY ("payout_provider_account_id") REFERENCES "payments"."payout_provider_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payout_provider_accounts" ADD CONSTRAINT "payout_provider_accounts_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "payments"."providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payout_webhook_events" ADD CONSTRAINT "payout_webhook_events_payout_provider_account_id_payout_provider_accounts_id_fk" FOREIGN KEY ("payout_provider_account_id") REFERENCES "payments"."payout_provider_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payouts" ADD CONSTRAINT "payouts_payout_account_id_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "payments"."payout_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."payouts" ADD CONSTRAINT "payouts_payout_provider_account_id_payout_provider_accounts_id_fk" FOREIGN KEY ("payout_provider_account_id") REFERENCES "payments"."payout_provider_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions"."promotion_benefit_ledger" ADD CONSTRAINT "promotion_benefit_ledger_benefit_id_promotion_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "promotions"."promotion_benefits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions"."promotion_benefit_ledger" ADD CONSTRAINT "promotion_benefit_ledger_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"."consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions"."promotion_benefits" ADD CONSTRAINT "promotion_benefits_wallet_id_promotion_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "promotions"."promotion_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions"."promotion_benefits" ADD CONSTRAINT "promotion_benefits_definition_id_promotion_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "promotions"."promotion_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions"."promotion_benefits" ADD CONSTRAINT "promotion_benefits_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions"."promotion_wallets" ADD CONSTRAINT "promotion_wallets_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "merchant_payout_accounts_merchant_idx" ON "payments"."merchant_payout_accounts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "merchant_payout_accounts_account_idx" ON "payments"."merchant_payout_accounts" USING btree ("payout_account_id");--> statement-breakpoint
CREATE INDEX "payout_account_references_account_idx" ON "payments"."payout_account_references" USING btree ("payout_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_account_references_unique_resource_idx" ON "payments"."payout_account_references" USING btree ("payout_provider_account_id","reference_type","provider_reference");--> statement-breakpoint
CREATE INDEX "payout_accounts_provider_idx" ON "payments"."payout_accounts" USING btree ("payout_provider_account_id");--> statement-breakpoint
CREATE INDEX "payout_accounts_status_idx" ON "payments"."payout_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payout_onboardings_provider_idx" ON "payments"."payout_onboardings" USING btree ("payout_provider_account_id");--> statement-breakpoint
CREATE INDEX "payout_onboardings_status_idx" ON "payments"."payout_onboardings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_provider_accounts_provider_environment_idx" ON "payments"."payout_provider_accounts" USING btree ("provider_id","environment");--> statement-breakpoint
CREATE INDEX "payout_webhook_events_provider_idx" ON "payments"."payout_webhook_events" USING btree ("payout_provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_webhook_events_unique_event_idx" ON "payments"."payout_webhook_events" USING btree ("payout_provider_account_id","provider_event_id");--> statement-breakpoint
CREATE INDEX "payout_webhook_events_status_idx" ON "payments"."payout_webhook_events" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "payouts_payout_account_idx" ON "payments"."payouts" USING btree ("payout_account_id");--> statement-breakpoint
CREATE INDEX "payouts_provider_idx" ON "payments"."payouts" USING btree ("payout_provider_account_id");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payments"."payouts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_idempotency_key_unique_idx" ON "payments"."payouts" USING btree ("idempotency_key");