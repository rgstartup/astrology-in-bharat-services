-- payments.partner_payout_accounts: independent payout-account records
CREATE TYPE "payments"."partner_payout_account_status_enum" AS ENUM('PENDING', 'AUTHORIZED', 'ACTIVE', 'FAILED');--> statement-breakpoint
CREATE TABLE "payments"."partner_payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_provider" text NOT NULL,
	"provider_product" text NOT NULL,
	"onboarding_status" "payments"."partner_payout_account_status_enum" DEFAULT 'PENDING' NOT NULL,
	"account_status" text,
	"failure_reason" text,
	"external_account_id" text,
	"provider_access_token" text,
	"provider_refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"state" text,
	"authorized_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"metadata" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- expert.expert_payout_accounts: one-sided relation table linking experts to partner payout accounts
CREATE TABLE "expert"."expert_payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"partner_payout_account_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expert_payout_accounts_expert_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade,
	CONSTRAINT "expert_payout_accounts_partner_payout_account_id_fk" FOREIGN KEY ("partner_payout_account_id") REFERENCES "payments"."partner_payout_accounts"("id") ON DELETE cascade
);--> statement-breakpoint
