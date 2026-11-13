import {
  boolean,
  index,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { payoutProviderAccounts } from './payout-provider-accounts.schema';

const paymentSchema = pgSchema('payments');

/**
 * Webhook event processing status.
 */
export const payoutWebhookProcessingStatusEnum = pgEnum(
  'payout_webhook_processing_status_enum',
  ['received', 'verified', 'pending', 'processing', 'processed', 'failed', 'ignored'],
);

/**
 * Incoming provider webhook event — durable log before acknowledgement.
 *
 * Idempotent via unique constraint on (payout_provider_account_id,
 * provider_event_id) where the provider supplies stable event IDs.
 */
export const payoutWebhookEvents = paymentSchema.table(
  'payout_webhook_events',
  {
    id: serial('id').primaryKey(),
    /** FK to payout_provider_accounts — the provider account this event belongs to. */
    payout_provider_account_id: integer('payout_provider_account_id')
      .notNull()
      .references(() => payoutProviderAccounts.id, { onDelete: 'restrict' }),
    provider_event_id: text('provider_event_id').notNull(),
    event_type: text('event_type').notNull(),
    normalized_event_type: text('normalized_event_type'),
    /** Original or safely retained event payload (JSON). */
    payload: json('payload').$type<Record<string, unknown> | null>(),
    signature_verified: boolean('signature_verified').notNull().default(false),
    processing_status: payoutWebhookProcessingStatusEnum('processing_status')
      .notNull()
      .default('received'),
    processing_attempts: integer('processing_attempts').notNull().default(0),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    failure_message: text('failure_message'),
    received_at: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: index('payout_webhook_events_provider_idx').on(
      table.payout_provider_account_id,
    ),
    uniqueEvent: uniqueIndex(
      'payout_webhook_events_unique_event_idx',
    ).on(table.payout_provider_account_id, table.provider_event_id),
    statusIdx: index('payout_webhook_events_status_idx').on(
      table.processing_status,
    ),
  }),
);

export const payoutWebhookEventsRelations = relations(
  payoutWebhookEvents,
  ({ one }) => ({
    providerAccount: one(payoutProviderAccounts, {
      fields: [payoutWebhookEvents.payout_provider_account_id],
      references: [payoutProviderAccounts.id],
    }),
  }),
);

export type PayoutWebhookEventRow = typeof payoutWebhookEvents.$inferSelect;
export type NewPayoutWebhookEventRow =
  typeof payoutWebhookEvents.$inferInsert;
