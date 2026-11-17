-- Drop legacy expert.bank_accounts table (archived BE-12 BankAccountsModule).
ALTER TABLE finance.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_bank_account_id_fkey;
DROP TABLE IF EXISTS expert.bank_accounts;
