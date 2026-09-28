import {
  bigint,
  boolean,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  PricingStatus,
  PricingTargetAudience,
} from '@/internal/domains/expert/shared/enums/pricing.enum';
import { productVariants } from './product-variants.schema';
import { clientAccounts } from '../../client/client-account.schema';

const commerceSchema = pgSchema('commerce');

export const variantPricingAudienceEnum = pgEnum(
  'product_variant_pricing_target_audience_enum',
  PricingTargetAudience,
);

export const variantPricingStatusEnum = pgEnum(
  'product_variant_pricing_status_enum',
  PricingStatus,
);

/**
 * Drizzle mirror of `ProductVariantPricing`
 * (`commerce.product_variant_pricing` TypeORM entity).
 * Source: src/internal/commerce/product/entities/pricing.entity.ts
 *
 * `variant_id` is `bigint` to match `product_variants.id`.
 */
export const productVariantPricing = commerceSchema.table(
  'product_variant_pricing',
  {
    id: serial('id').primaryKey(),
    variant_id: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    client_id: integer('client_id').references(() => clientAccounts.id, {
      onDelete: 'set null',
    }),
    target_audience: variantPricingAudienceEnum('target_audience')
      .notNull()
      .default(PricingTargetAudience.ALL),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    is_active: boolean('is_active').notNull().default(true),
    status: variantPricingStatusEnum('status')
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
);

export const productVariantPricingRelations = relations(
  productVariantPricing,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [productVariantPricing.variant_id],
      references: [productVariants.id],
    }),
    client: one(clientAccounts, {
      fields: [productVariantPricing.client_id],
      references: [clientAccounts.id],
    }),
  }),
);

export type ProductVariantPricingRow =
  typeof productVariantPricing.$inferSelect;
export type NewProductVariantPricingRow =
  typeof productVariantPricing.$inferInsert;
