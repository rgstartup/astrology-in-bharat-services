import {
  bigint,
  boolean,
  integer,
  pgEnum,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { MediaRole } from '@/internal/commerce/product/enum';
import { products } from './products.schema';
import { productVariants } from './product-variants.schema';
import { media } from '../../media/media.schema';

const commerceSchema = pgSchema('commerce');

export const variantMediaRoleEnum = pgEnum(
  'product_variant_media_media_role_enum',
  MediaRole,
);

/**
 * Drizzle mirror of `ProductMedia` (`commerce.product_variant_media`
 * TypeORM entity).
 * Source: src/internal/commerce/product/entities/media.entity.ts
 */
export const productVariantMedia = commerceSchema.table(
  'product_variant_media',
  {
    id: serial('id').primaryKey(),
    product_id: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variant_id: bigint('variant_id', { mode: 'number' }).references(
      () => productVariants.id,
      { onDelete: 'cascade' },
    ),
    media_id: integer('media_id')
      .notNull()
      .references(() => media.id),
    media_role: variantMediaRoleEnum('media_role'),
    is_primary: boolean('is_primary').notNull().default(false),
    is_active: boolean('is_active').notNull().default(true),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const productVariantMediaRelations = relations(
  productVariantMedia,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariantMedia.product_id],
      references: [products.id],
    }),
    variant: one(productVariants, {
      fields: [productVariantMedia.variant_id],
      references: [productVariants.id],
    }),
    media: one(media, {
      fields: [productVariantMedia.media_id],
      references: [media.id],
    }),
  }),
);

export type ProductVariantMediaRow = typeof productVariantMedia.$inferSelect;
export type NewProductVariantMediaRow = typeof productVariantMedia.$inferInsert;
