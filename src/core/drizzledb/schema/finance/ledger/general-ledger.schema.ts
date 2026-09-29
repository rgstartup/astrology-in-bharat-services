import {
  numeric,
  integer,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '../../../../enums';

const financeSchema = pgSchema('finance');

export const generalLedgerEntryTypeEnum = pgEnum(
  'finance_general_ledger_entry_type_enum',
  GeneralLedgerEntryType,
);

export const generalLedgerPartyTypeEnum = pgEnum(
  'finance_general_ledger_party_type_enum',
  GeneralLedgerPartyType,
);

export const generalLedgerEventTypeEnum = pgEnum(
  'finance_general_ledger_event_type_enum',
  GeneralLedgerEventType,
);

/**
 * Drizzle mirror of `GeneralLedgerEntry` (`finance.general_ledger` TypeORM entity).
 * Source: src/internal/finance/ledger/entities/general-ledger-entry.entity.ts
 */
export const generalLedger = financeSchema.table('general_ledger', {
  id: serial('id').primaryKey(),
  event_id: text('event_id'),
  event_type: generalLedgerEventTypeEnum('event_type').notNull(),
  entry_type: generalLedgerEntryTypeEnum('entry_type').notNull(),
  party_type: generalLedgerPartyTypeEnum('party_type').notNull(),
  party_id: integer('party_id'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  note: text('note'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GeneralLedgerEntryRow = typeof generalLedger.$inferSelect;
export type NewGeneralLedgerEntryRow = typeof generalLedger.$inferInsert;
