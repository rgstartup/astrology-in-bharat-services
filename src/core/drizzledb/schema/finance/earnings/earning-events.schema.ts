import {
  jsonb,
  numeric,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { earningTypeEnum } from './earning-enums.schema';

const financeSchema = pgSchema('finance');

export const earningEvents = financeSchema.table('earning_events', {
  id: serial('id').primaryKey(),
  event_ref: varchar('event_ref', { length: 120 }).notNull().unique(),
  source_type: earningTypeEnum('source_type').notNull(),
  source_id: varchar('source_id', { length: 100 }).notNull(),
  gross_amount: numeric('gross_amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  context_payload: jsonb('context_payload').notNull(),
  occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EarningEventRow = typeof earningEvents.$inferSelect;
export type NewEarningEventRow = typeof earningEvents.$inferInsert;
