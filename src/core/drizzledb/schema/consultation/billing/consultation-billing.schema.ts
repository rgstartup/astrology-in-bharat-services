import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ConsultationBillingStatus } from '@/internal/consultation/enums';
import { consultations } from '../consultation/consultation.schema';
import { earningSplits } from '@/core/drizzledb/schema/finance/earnings/earning-splits.schema';

const consultationsSchema = pgSchema('consultations');

export const consultationBillingsStatusEnum = pgEnum(
  'consultation_billings_status_enum',
  ConsultationBillingStatus,
);

/**
 * Pre-payout computation of a consultation
 * (`consultations.consultation_billings`). One row per consultation
 * (unique `consultation_id`); billable time is derived from the
 * consultation's sessions.
 *
 * This table records ONLY what was earned and what is withheld before
 * payout: gross, platform_fee, tax, other deductions, and the resulting
 * net_payable. Everything after that — policy lookup, expert/agent
 * shares, ledger postings — belongs to the earnings module
 * (`finance.earning_splits`, linked via `earning_split_id`):
 *   billing.gross_earning <-> earning_splits.gross_amount
 *   billing.platform_fee  <-> earning_splits.platform_earning
 *   billing.tax           <-> earning_splits.gst_on_platform_fee
 * `net_payable` is the amount the earnings module splits out.
 */
export const consultationBillings = consultationsSchema.table(
  'consultation_billings',
  {
    id: serial('id').primaryKey(),
    consultation_id: integer('consultation_id')
      .notNull()
      .unique()
      .references(() => consultations.id, { onDelete: 'cascade' }),
    status: consultationBillingsStatusEnum('status')
      .notNull()
      .default(ConsultationBillingStatus.DRAFT),

    rate_per_minute: numeric('rate_per_minute', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    billable_seconds: integer('billable_seconds').notNull().default(0),
    billable_minutes: numeric('billable_minutes', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),

    gross_earning: numeric('gross_earning', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    platform_fee: numeric('platform_fee', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    tax: numeric('tax', { precision: 12, scale: 2 }).notNull().default('0'),
    other_deductions: numeric('other_deductions', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    /** Named breakdown of `other_deductions` (discount, adjustment...). */
    deduction_breakdown: jsonb('deduction_breakdown').$type<Record<
      string,
      number
    > | null>(),
    /**
     * Amount released toward expert payout:
     * gross_earning - platform_fee - tax - other_deductions.
     * Stored (not derived) for audit.
     */
    net_payable: numeric('net_payable', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),

    /** Payout-split counterpart in `finance.earning_splits`, if settled. */
    earning_split_id: integer('earning_split_id').references(
      () => earningSplits.id,
      { onDelete: 'set null' },
    ),

    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const consultationBillingsRelations = relations(
  consultationBillings,
  ({ one }) => ({
    consultation: one(consultations, {
      fields: [consultationBillings.consultation_id],
      references: [consultations.id],
    }),
    earningSplit: one(earningSplits, {
      fields: [consultationBillings.earning_split_id],
      references: [earningSplits.id],
    }),
  }),
);

export type ConsultationBillingRow = typeof consultationBillings.$inferSelect;
export type NewConsultationBillingRow =
  typeof consultationBillings.$inferInsert;
