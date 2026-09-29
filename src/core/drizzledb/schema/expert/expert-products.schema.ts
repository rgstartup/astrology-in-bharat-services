import { integer, pgEnum, pgSchema, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertAccounts } from './expert-account.schema';
import { products } from '../commerce/product/products.schema';
import { ExpertProductRelationType } from '@/internal/domains/expert/products/enum/expert-product-relation-type.enum';

const expertSchema = pgSchema('expert');

export const expertProductRelationTypeEnum = pgEnum(
  'expert_products_relation_type_enum',
  ExpertProductRelationType,
);

/**
 * Drizzle mirror of `ExpertProducts` (`expert.expert_products` TypeORM entity).
 * Source: src/internal/domains/expert/products/entities/expert-product.entity.ts
 */
export const expertProducts = expertSchema.table('expert_products', {
  id: serial('id').primaryKey(),
  expert_id: integer('expert_id')
    .notNull()
    .references(() => expertAccounts.id, { onDelete: 'cascade' }),
  product_id: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  relation_type: expertProductRelationTypeEnum('relation_type')
    .notNull()
    .default(ExpertProductRelationType.PROVIDER),
});

export const expertProductsRelations = relations(expertProducts, ({ one }) => ({
  expert: one(expertAccounts, {
    fields: [expertProducts.expert_id],
    references: [expertAccounts.id],
  }),
  product: one(products, {
    fields: [expertProducts.product_id],
    references: [products.id],
  }),
}));

export type ExpertProductRow = typeof expertProducts.$inferSelect;
export type NewExpertProductRow = typeof expertProducts.$inferInsert;
