import {
  index,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { payoutProviderConfigs } from './payout-provider-configs.schema';

const paymentSchema = pgSchema('payments');

/**
 * Normalized onboarding status — provider-agnostic lifecycle.
 */
export const payoutOnboardingStatusEnum = pgEnum(
  'payout_onboarding_status_enum',
  [
    'pending',
    'in_progress',
    'requires_action',
    'submitted',
    'under_review',
    'completed',
    'rejected',
    'expired',
    'failed',
    'cancelled',
  ],
);

/**
 * Normalized onboarding action required by the partner.
 */
export const payoutOnboardingActionEnum = pgEnum(
  'payout_onboarding_action_enum',
  ['none', 'redirect', 'submit_details', 'verify', 'wait'],
);

/**
 * Payout onboarding attempt.
 *
 * One attempt per partner per provider config. Separate from payout_accounts —
 * an attempt may be rejected/expired while a later attempt succeeds. Tracks the
 * normalized status and the provider reference returned by the adapter.
 */
export const payoutOnboardings = paymentSchema.table(
  'payout_onboardings',
  {
    id: serial('id').primaryKey(),
    /** FK to payout_provider_configs — the provider config selected for this attempt. */
    payout_provider_account_id: integer('payout_provider_account_id')
      .notNull()
      .references(() => payoutProviderConfigs.id, { onDelete: 'restrict' }),
    status: payoutOnboardingStatusEnum('status')
      .notNull()
      .default('pending'),
    action_required: payoutOnboardingActionEnum('action_required')
      .notNull()
      .default('none'),
    /** Hosted onboarding URL, if the provider uses redirect flow. */
    action_url: text('action_url'),
    /** Primary provider onboarding reference (nullable until provider confirms). */
    provider_reference: text('provider_reference'),
    /** Provider-specific non-sensitive data (JSON). */
    provider_metadata: json('provider_metadata').$type<
      Record<string, unknown> | null
    >(),
    failure_code: text('failure_code'),
    failure_message: text('failure_message'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: index('payout_onboardings_provider_idx').on(
      table.payout_provider_account_id,
    ),
    statusIdx: index('payout_onboardings_status_idx').on(table.status),
  }),
);

export const payoutOnboardingsRelations = relations(
  payoutOnboardings,
  ({ one }) => ({
    providerAccount: one(payoutProviderConfigs, {
      fields: [payoutOnboardings.payout_provider_account_id],
      references: [payoutProviderConfigs.id],
    }),
  }),
);

export type PayoutOnboardingRow = typeof payoutOnboardings.$inferSelect;
export type NewPayoutOnboardingRow =
  typeof payoutOnboardings.$inferInsert;
