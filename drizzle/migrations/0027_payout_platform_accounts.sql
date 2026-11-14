-- payments.payout_platform_accounts: new table for generic payout platform accounts (RazorpayX, Cashfree, Decentro, ...)
-- enum type for validation status lifecycle
DO $$ BEGIN
  CREATE TYPE "payments"."payout_account_validation_status_enum" AS ENUM ('PENDING', 'INITIATED', 'VALIDATED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "payments"."payout_platform_accounts" (
  "id" serial PRIMARY KEY,
  "platform" text NOT NULL,
  "platform_contact_id" text,
  "platform_fund_id" text UNIQUE,
  "account_type" text NOT NULL DEFAULT 'bank_account',
  "bank_name" text,
  "account_number_masked" text,
  "ifsc" text,
  "vpa" text,
  "validation_status" "payments"."payout_account_validation_status_enum" NOT NULL DEFAULT 'PENDING',
  "validation_id" text,
  "failure_reason" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
