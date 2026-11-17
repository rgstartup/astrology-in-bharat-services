-- payments.payout_accounts: add bank display fields so expert can identify their payout account
-- after RazorpayX form submit. Stores last-4 digits, bank name, IFSC.
ALTER TABLE payments.payout_accounts
  ADD COLUMN IF NOT EXISTS account_number_masked text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS ifsc text;
