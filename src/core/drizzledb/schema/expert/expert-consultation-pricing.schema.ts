import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { expertAccounts } from './expert-account.schema';
import { clientAccounts } from '../client/client-account.schema';
import {
  PricingStatus,
  PricingTargetAudience,
} from '../../../../internal/actors/expert/shared/enums/pricing.enum';

const expertSchema = pgSchema('expert');

export const expertPricingTargetAudienceEnum = pgEnum(
  'expert_consultation_pricing_target_audience_enum',
  PricingTargetAudience,
);

export const expertPricingStatusEnum = pgEnum(
  'expert_consultation_pricing_status_enum',
  PricingStatus,
);

/**
 * Drizzle mirror of `ExpertConsultationPricing` (`expert.expert_consultation_pricing` TypeORM entity).
 * Source: src/internal/domains/expert/account/entities/expert-consultation-pricing.entity.ts
 */
export const expertConsultationPricing = expertSchema.table(
  'expert_consultation_pricing',
  {
    id: serial('id').primaryKey(),
    expert_id: integer('expert_id')
      .notNull()
      .references(() => expertAccounts.id, { onDelete: 'cascade' }),
    client_id: integer('client_id').references(() => clientAccounts.id, {
      onDelete: 'set null',
    }),
    target_audience: expertPricingTargetAudienceEnum('target_audience')
      .notNull()
      .default(PricingTargetAudience.ALL),
    chat_price: numeric('chat_price', { precision: 10, scale: 2 }),
    call_price: numeric('call_price', { precision: 10, scale: 2 }),
    video_call_price: numeric('video_call_price', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    is_active: boolean('is_active').notNull().default(true),
    status: expertPricingStatusEnum('status')
      .notNull()
      .default(PricingStatus.ACTIVE),
    effective_from: timestamp('effective_from', { withTimezone: true })
      .notNull()
      .defaultNow(),
    effective_to: timestamp('effective_to', { withTimezone: true }),
    change_reason: text('change_reason'),
    changed_by: integer('changed_by'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('IDX_expert_consultation_pricing_lookup').on(
      table.expert_id,
      table.target_audience,
      table.is_active,
      table.effective_from,
    ),
    index('IDX_expert_consultation_client_pricing')
      .on(table.expert_id, table.client_id, table.is_active)
      .where(sql`"client_id" IS NOT NULL`),
  ],
);

export const expertConsultationPricingRelations = relations(
  expertConsultationPricing,
  ({ one }) => ({
    expert: one(expertAccounts, {
      fields: [expertConsultationPricing.expert_id],
      references: [expertAccounts.id],
    }),
    client: one(clientAccounts, {
      fields: [expertConsultationPricing.client_id],
      references: [clientAccounts.id],
    }),
  }),
);

export type ExpertConsultationPricingRow =
  typeof expertConsultationPricing.$inferSelect;
export type NewExpertConsultationPricingRow =
  typeof expertConsultationPricing.$inferInsert;
