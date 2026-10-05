-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_category_enum" AS ENUM('consultation', 'commerce', 'booking', 'partner');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_type_enum" AS ENUM('realtime_consultation', 'scheduled_consultation', 'product_sale', 'booking_service', 'partner_supply_onboarding', 'partner_demand_acquisition', 'partner_network_override');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_rule_status_enum" AS ENUM('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_recipient_type_enum" AS ENUM('platform', 'tax_authority', 'provider_expert', 'provider_merchant', 'partner_seller_agent', 'partner_buyer_agent', 'partner_parent_agent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_calc_method_enum" AS ENUM('percentage', 'fixed_amount', 'per_unit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_tier_basis_enum" AS ENUM('transaction_amount', 'monthly_revenue', 'monthly_gmv', 'lifetime_revenue', 'partner_onboarded_count', 'consultation_count');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_subject_type_enum" AS ENUM('global', 'category', 'expert', 'merchant', 'partner_agent', 'product');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_earning_allocation_status_enum" AS ENUM('calculated', 'pending_escrow', 'settled', 'reversed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_account_owner_type_enum" AS ENUM('expert', 'partner_agent', 'merchant', 'platform', 'client');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_account_status_enum" AS ENUM('active', 'frozen', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_account_type_enum" AS ENUM('client_clearing', 'platform_clearing', 'platform_revenue', 'tax_escrow', 'expert_wallet', 'merchant_wallet', 'partner_agent_wallet', 'gateway_clearing');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_transaction_event_type_enum" AS ENUM('earning_settlement', 'escrow_hold', 'escrow_release', 'refund_reversal', 'payout', 'wallet_topup', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_transaction_ref_type_enum" AS ENUM('earning_event', 'withdrawal', 'refund', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."finance_transaction_status_enum" AS ENUM('posted', 'pending', 'reversed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 2. Update earning_policies table
ALTER TABLE "finance"."earning_policies" DROP CONSTRAINT IF EXISTS "earning_policies_applies_to_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ALTER COLUMN "effective_from" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "code" varchar(80);
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "category" "finance_earning_category_enum" NOT NULL DEFAULT 'consultation';
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "type" "finance_earning_type_enum" NOT NULL DEFAULT 'realtime_consultation';
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'INR' NOT NULL;
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "status" "finance_earning_rule_status_enum" DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "effective_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD COLUMN IF NOT EXISTS "created_by" integer;
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP CONSTRAINT IF EXISTS "earning_policies_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD CONSTRAINT "earning_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "event_type";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "platform_cut_type";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "platform_cut_value";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "buyer_platform_fee";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "gst_rate_percent";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "seller_agent_rate";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "buyer_agent_rate";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "applies_to_role";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "applies_to_user_id";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "min_amount";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "max_cap";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "priority";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "is_active";
--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" DROP COLUMN IF EXISTS "effective_to";
--> statement-breakpoint

-- 3. Create generic earning & ledger tables
CREATE TABLE IF NOT EXISTS "finance"."earning_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_ref" varchar(120) NOT NULL,
	"source_type" "finance_earning_type_enum" NOT NULL,
	"source_id" varchar(100) NOT NULL,
	"gross_amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"context_payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "earning_events_event_ref_unique" UNIQUE("event_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."earning_policy_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"earning_policy_id" integer NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(150) NOT NULL,
	"recipient_type" "finance_earning_recipient_type_enum" NOT NULL,
	"calculation_method" "finance_earning_calc_method_enum" NOT NULL,
	"value" numeric(12, 4),
	"currency" varchar(3) DEFAULT 'INR',
	"tier_basis" "finance_earning_tier_basis_enum",
	"status" "finance_earning_rule_status_enum" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."earning_policy_rule_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"earning_policy_rule_id" integer NOT NULL,
	"tier_title" varchar(150) NOT NULL,
	"tiers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "earning_policy_rule_tiers_earning_policy_rule_id_unique" UNIQUE("earning_policy_rule_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."earning_policy_rule_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"recipient_type" "finance_earning_recipient_type_enum" NOT NULL,
	"allocation_method" "finance_earning_calc_method_enum" DEFAULT 'percentage' NOT NULL,
	"allocation_value" numeric(8, 4) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."earning_policy_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"earning_policy_id" integer NOT NULL,
	"subject_type" "finance_earning_subject_type_enum" NOT NULL,
	"subject_id" integer,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."earning_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"earning_event_id" integer NOT NULL,
	"earning_policy_id" integer NOT NULL,
	"earning_policy_rule_id" integer NOT NULL,
	"recipient_type" "finance_earning_recipient_type_enum" NOT NULL,
	"recipient_id" integer,
	"base_amount" numeric(14, 2) NOT NULL,
	"calculation_method" "finance_earning_calc_method_enum" NOT NULL,
	"applied_rate" numeric(10, 4),
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "finance_earning_allocation_status_enum" DEFAULT 'calculated' NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."financial_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"owner_type" "finance_account_owner_type_enum" NOT NULL,
	"owner_id" integer,
	"account_type" "finance_account_type_enum" NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "finance_account_status_enum" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."financial_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_ref" varchar(120) NOT NULL,
	"type" "finance_transaction_event_type_enum" NOT NULL,
	"reference_type" "finance_transaction_ref_type_enum" NOT NULL,
	"reference_id" varchar(100) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"status" "finance_transaction_status_enum" DEFAULT 'posted' NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_transactions_transaction_ref_unique" UNIQUE("transaction_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."financial_transaction_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 4. Add foreign keys
DO $$ BEGIN
  ALTER TABLE "finance"."earning_policy_rules" ADD CONSTRAINT "earning_policy_rules_earning_policy_id_earning_policies_id_fk" FOREIGN KEY ("earning_policy_id") REFERENCES "finance"."earning_policies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."earning_policy_rule_tiers" ADD CONSTRAINT "earning_policy_rule_tiers_earning_policy_rule_id_earning_policy_rules_id_fk" FOREIGN KEY ("earning_policy_rule_id") REFERENCES "finance"."earning_policy_rules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."earning_policy_rule_allocations" ADD CONSTRAINT "earning_policy_rule_allocations_rule_id_earning_policy_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "finance"."earning_policy_rules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."earning_policy_assignments" ADD CONSTRAINT "earning_policy_assignments_earning_policy_id_earning_policies_id_fk" FOREIGN KEY ("earning_policy_id") REFERENCES "finance"."earning_policies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."earning_allocations" ADD CONSTRAINT "earning_allocations_earning_event_id_earning_events_id_fk" FOREIGN KEY ("earning_event_id") REFERENCES "finance"."earning_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."earning_allocations" ADD CONSTRAINT "earning_allocations_earning_policy_id_earning_policies_id_fk" FOREIGN KEY ("earning_policy_id") REFERENCES "finance"."earning_policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."earning_allocations" ADD CONSTRAINT "earning_allocations_earning_policy_rule_id_earning_policy_rules_id_fk" FOREIGN KEY ("earning_policy_rule_id") REFERENCES "finance"."earning_policy_rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."financial_transaction_entries" ADD CONSTRAINT "financial_transaction_entries_transaction_id_financial_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "finance"."financial_transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "finance"."financial_transaction_entries" ADD CONSTRAINT "financial_transaction_entries_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "finance"."financial_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
