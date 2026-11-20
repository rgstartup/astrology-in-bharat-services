-- drop kyc_status column from expert.account and expert.profile tables,
-- along with the account_kyc_status_enum type
ALTER TABLE expert.account
  DROP COLUMN IF EXISTS kyc_status;

ALTER TABLE expert.profile
  DROP COLUMN IF EXISTS kyc_status;

DROP TYPE IF EXISTS account_kyc_status_enum;
