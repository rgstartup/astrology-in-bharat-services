-- expert.expert_payout_platform_accounts: new relation table linking experts to payout platform accounts
CREATE TABLE IF NOT EXISTS "expert"."expert_payout_platform_accounts" (
  "id" serial PRIMARY KEY,
  "expert_id" integer NOT NULL REFERENCES "expert"."account"("id") ON DELETE CASCADE,
  "payout_platform_account_id" integer NOT NULL REFERENCES "payments"."payout_platform_accounts"("id") ON DELETE CASCADE,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
