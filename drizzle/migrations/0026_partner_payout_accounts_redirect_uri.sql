-- payments.partner_payout_accounts: add redirect_uri column (set during initiate, read during callback)
ALTER TABLE "payments"."partner_payout_accounts" ADD COLUMN IF NOT EXISTS "redirect_uri" text;
