import { relations } from 'drizzle-orm';
import {
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { clientAccounts } from '../client/client-account.schema';
import { consultations } from '../consultation/consultation/consultation.schema';

const promotionsSchema = pgSchema('promotions');

/** Lifecycle of a promotion definition. Retired grants keep their row. */
export const PROMOTION_STATUS = ['active', 'retired'] as const;
export type PromotionStatus = (typeof PROMOTION_STATUS)[number];

/** Benefit units supported by the promotions engine. */
export const PROMOTION_BENEFIT_TYPES = ['chat_seconds'] as const;
export type PromotionBenefitType = (typeof PROMOTION_BENEFIT_TYPES)[number];

/**
 * Versioned promotion definitions (`promotions.promotion_definitions`).
 * Code + version pins the spec; benefit_quantity is seconds of the
 * granted benefit (e.g. WELCOME_CHAT_5 => 300 chat seconds).
 */
export const promotionDefinitions = promotionsSchema.table('promotion_definitions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  status: text('status')
    .$type<PromotionStatus>()
    .notNull()
    .default('active'),
  benefit_type: text('benefit_type')
    .$type<PromotionBenefitType>()
    .notNull()
    .default('chat_seconds'),
  /** Granted benefit size, in seconds. */
  benefit_quantity: integer('benefit_quantity').notNull().default(300),
  starts_at: timestamp('starts_at', { withTimezone: true }),
  ends_at: timestamp('ends_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Per-client promotions wallet (`promotions.promotion_wallets`).
 * Only exists for bookkeeping grouping; benefit rows hold the real balance.
 */
export const promotionWallets = promotionsSchema.table('promotion_wallets', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .unique()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A granted benefit (`promotions.promotion_benefits`). Remaining seconds
 * are derived as granted_seconds - consumed_seconds; expiry is a query-time
 * check against `expires_at`, so no stored status can drift.
 */
export const promotionBenefits = promotionsSchema.table('promotion_benefits', {
  id: serial('id').primaryKey(),
  wallet_id: integer('wallet_id')
    .notNull()
    .references(() => promotionWallets.id, { onDelete: 'cascade' }),
  definition_id: integer('definition_id')
    .notNull()
    .references(() => promotionDefinitions.id),
  client_id: integer('client_id')
    .notNull()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  benefit_type: text('benefit_type')
    .$type<PromotionBenefitType>()
    .notNull()
    .default('chat_seconds'),
  granted_seconds: integer('granted_seconds').notNull(),
  consumed_seconds: integer('consumed_seconds').notNull().default(0),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Immutable audit trail of every balance change
 * (`promotions.promotion_benefit_ledger`). Executed consumption visits
 * monotonically forward; positives are grants/adjustments.
 */
export const promotionBenefitLedger = promotionsSchema.table(
  'promotion_benefit_ledger',
  {
    id: serial('id').primaryKey(),
    benefit_id: integer('benefit_id')
      .notNull()
      .references(() => promotionBenefits.id, { onDelete: 'cascade' }),
    consultation_id: integer('consultation_id').references(
      () => consultations.id,
      { onDelete: 'set null' },
    ),
    /** Signed delta applied to the benefit balance (seconds). */
    delta_seconds: integer('delta_seconds').notNull(),
    balance_after: integer('balance_after').notNull(),
    reason: text('reason').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const promotionWalletsRelations = relations(promotionWallets, ({ one, many }) => ({
  client: one(clientAccounts, {
    fields: [promotionWallets.client_id],
    references: [clientAccounts.id],
  }),
  benefits: many(promotionBenefits),
}));

export const promotionBenefitsRelations = relations(promotionBenefits, ({ one, many }) => ({
  wallet: one(promotionWallets, {
    fields: [promotionBenefits.wallet_id],
    references: [promotionWallets.id],
  }),
  definition: one(promotionDefinitions, {
    fields: [promotionBenefits.definition_id],
    references: [promotionDefinitions.id],
  }),
  ledger: many(promotionBenefitLedger),
}));

export const promotionBenefitLedgerRelations = relations(promotionBenefitLedger, ({ one }) => ({
  benefit: one(promotionBenefits, {
    fields: [promotionBenefitLedger.benefit_id],
    references: [promotionBenefits.id],
  }),
}));

export type PromotionDefinitionRow = typeof promotionDefinitions.$inferSelect;
export type PromotionWalletRow = typeof promotionWallets.$inferSelect;
export type PromotionBenefitRow = typeof promotionBenefits.$inferSelect;
export type PromotionBenefitLedgerRow = typeof promotionBenefitLedger.$inferSelect;
