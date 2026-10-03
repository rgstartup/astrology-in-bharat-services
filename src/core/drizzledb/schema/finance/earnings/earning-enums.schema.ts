import { pgEnum } from 'drizzle-orm/pg-core';
import {
  EarningAppliesRole,
  EarningEventType,
  EarningRateType,
} from '@/internal/finance/earnings/enum';

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
