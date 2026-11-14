CREATE TYPE "payments"."payout_account_reference_type_enum" AS ENUM('contact', 'fund_account', 'beneficiary', 'connected_account', 'external_account', 'provider_customer', 'other');--> statement-breakpoint
CREATE TYPE "payments"."payout_account_status_enum" AS ENUM('pending', 'active', 'restricted', 'suspended', 'rejected', 'disabled');--> statement-breakpoint
CREATE TYPE "payments"."payout_onboarding_action_enum" AS ENUM('none', 'redirect', 'submit_details', 'verify', 'wait');--> statement-breakpoint
CREATE TYPE "payments"."payout_onboarding_status_enum" AS ENUM('pending', 'in_progress', 'requires_action', 'submitted', 'under_review', 'completed', 'rejected', 'expired', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "payments"."payout_provider_account_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "payments"."payout_status_enum" AS ENUM('created', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'reversed');--> statement-breakpoint
CREATE TYPE "payments"."payout_verification_status_enum" AS ENUM('not_started', 'pending', 'under_review', 'verified', 'rejected', 'requires_action');--> statement-breakpoint
CREATE TYPE "payments"."payout_webhook_processing_status_enum" AS ENUM('received', 'verified', 'pending', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
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
	"status" "payments"."payout_provider_account_status_enum" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "payments"."payout_onboardings" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"status" "payments"."payout_onboarding_status_enum" DEFAULT 'pending' NOT NULL,
	"action_required" "payments"."payout_onboarding_action_enum" DEFAULT 'none' NOT NULL,
	"action_url" text,
	"provider_reference" text,
	"provider_metadata" json,
	"failure_code" text,
	"failure_message" text,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "payments"."payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"status" "payments"."payout_account_status_enum" DEFAULT 'pending' NOT NULL,
	"verification_status" "payments"."payout_verification_status_enum" DEFAULT 'not_started' NOT NULL,
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
);--> statement-breakpoint
CREATE TABLE "payments"."payout_account_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_account_id" integer NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"reference_type" "payments"."payout_account_reference_type_enum" NOT NULL,
	"provider_reference" text NOT NULL,
	"provider_metadata" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "payments"."payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_account_id" integer NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency_code" text DEFAULT 'INR' NOT NULL,
	"status" "payments"."payout_status_enum" DEFAULT 'created' NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "payments"."payout_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_provider_account_id" integer NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"normalized_event_type" text,
	"payload" json,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processing_status" "payments"."payout_webhook_processing_status_enum" DEFAULT 'received' NOT NULL,
	"processing_attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"failure_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "payments"."merchant_payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"payout_account_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
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
