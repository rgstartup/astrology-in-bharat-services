import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { DiscountType } from '../../../../../internal/commerce/product/enum';
import { PricingTargetAudience } from '../../../../../internal/domains/expert/shared/enums/pricing.enum';
import { productVariants } from './product-variants.schema';

const commerceSchema = pgSchema('commerce');

export const promotionDiscountTypeEnum = pgEnum(
  'product_variant_promotions_discount_type_enum',
  DiscountType,
);

export const promotionAudienceEnum = pgEnum(
  'product_variant_promotions_target_audience_enum',
  PricingTargetAudience,
);

/**
 * Drizzle mirror of `ProductVariantPromotions`
 * (`commerce.product_variant_promotions` TypeORM entity).
 * Source: src/internal/commerce/product/entities/promotions.entity.ts
 */
export const productVariantPromotions = commerceSchema.table(
  'product_variant_promotions',
  {
    id: serial('id').primaryKey(),
    variant_id: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    discount_type: promotionDiscountTypeEnum('discount_type').notNull(),
    discount_value: integer('discount_value').notNull(),
    target_audience: promotionAudienceEnum('target_audience')
      .notNull()
      .default(PricingTargetAudience.ALL),
    effective_from: timestamp('effective_from', {
      withTimezone: true,
    }).notNull(),
    effective_to: timestamp('effective_to', { withTimezone: true }),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_product_variant_promotions_lookup').on(
      t.variant_id,
      t.target_audience,
      t.is_active,
      t.effective_from,
    ),
  ],
);

export const productVariantPromotionsRelations = relations(
  productVariantPromotions,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [productVariantPromotions.variant_id],
      references: [productVariants.id],
    }),
  }),
);

export type ProductVariantPromotionRow =
  typeof productVariantPromotions.$inferSelect;
export type NewProductVariantPromotionRow =
  typeof productVariantPromotions.$inferInsert;
