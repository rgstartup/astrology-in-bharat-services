import { pgEnum } from 'drizzle-orm/pg-core';
import {
  EarningAppliesRole,
  EarningEventType,
  EarningRateType,
  EarningCategory,
  EarningType,
  EarningRuleStatus,
  EarningRecipientType,
  EarningCalculationMethod,
  EarningTierBasis,
  EarningSubjectType,
  EarningAllocationStatus,
  FinancialAccountType,
  FinancialAccountOwnerType,
  FinancialAccountStatus,
  FinancialTransactionStatus,
  FinancialTransactionReferenceType,
  FinancialTransactionEventType,
} from '@/core/enums';

// Legacy enums preserved for back-compat
export const earningEventTypeEnum = pgEnum(
  'finance_earning_event_type_enum',
  EarningEventType,
);

export const earningRateTypeEnum = pgEnum(
  'finance_earning_rate_type_enum',
  EarningRateType,
);

export const earningAppliesRoleEnum = pgEnum(
  'finance_earning_applies_role_enum',
  EarningAppliesRole,
);

// Generic Earning Engine Enums
export const earningCategoryEnum = pgEnum(
  'finance_earning_category_enum',
  EarningCategory,
);

export const earningTypeEnum = pgEnum(
  'finance_earning_type_enum',
  EarningType,
);

export const earningRuleStatusEnum = pgEnum(
  'finance_earning_rule_status_enum',
  EarningRuleStatus,
);

export const earningRecipientTypeEnum = pgEnum(
  'finance_earning_recipient_type_enum',
  EarningRecipientType,
);

export const earningCalculationMethodEnum = pgEnum(
  'finance_earning_calc_method_enum',
  EarningCalculationMethod,
);

export const earningTierBasisEnum = pgEnum(
  'finance_earning_tier_basis_enum',
  EarningTierBasis,
);

export const earningSubjectTypeEnum = pgEnum(
  'finance_earning_subject_type_enum',
  EarningSubjectType,
);

export const earningAllocationStatusEnum = pgEnum(
  'finance_earning_allocation_status_enum',
  EarningAllocationStatus,
);

export const financialAccountTypeEnum = pgEnum(
  'finance_account_type_enum',
  FinancialAccountType,
);

export const financialAccountOwnerTypeEnum = pgEnum(
  'finance_account_owner_type_enum',
  FinancialAccountOwnerType,
);

export const financialAccountStatusEnum = pgEnum(
  'finance_account_status_enum',
  FinancialAccountStatus,
);

export const financialTransactionStatusEnum = pgEnum(
  'finance_transaction_status_enum',
  FinancialTransactionStatus,
);

export const financialTransactionReferenceTypeEnum = pgEnum(
  'finance_transaction_ref_type_enum',
  FinancialTransactionReferenceType,
);

export const financialTransactionEventTypeEnum = pgEnum(
  'finance_transaction_event_type_enum',
  FinancialTransactionEventType,
);
