-- expert.expert_payout_accounts: add is_primary flag (per-expert primary selection)
ALTER TABLE "expert"."expert_payout_accounts" ADD COLUMN IF NOT EXISTS "is_primary" boolean NOT NULL DEFAULT false;
