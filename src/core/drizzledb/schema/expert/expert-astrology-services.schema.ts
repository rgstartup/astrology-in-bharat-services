import {
  boolean,
  doublePrecision,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertAccounts } from './expert-account.schema';

const expertSchema = pgSchema('expert');

/**
 * Drizzle mirror of `ExpertAstrologyService` (`expert.expert_astrology_services` TypeORM entity).
 * Source: src/internal/domains/expert/account/entities/expert-astrology-service.entity.ts
 */
export const expertAstrologyServices = expertSchema.table(
  'expert_astrology_services',
  {
    id: serial('id').primaryKey(),
    expert_id: integer('expert_id')
      .notNull()
      .references(() => expertAccounts.id, { onDelete: 'cascade' }),
    service_id: integer('service_id').notNull(),
    price: doublePrecision('price').notNull().default(0),
    is_enabled: boolean('is_enabled').notNull().default(true),
    languages: text('languages'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('UQ_expert_astrology_service').on(
      table.expert_id,
      table.service_id,
    ),
  ],
);

export const expertAstrologyServicesRelations = relations(
  expertAstrologyServices,
  ({ one }) => ({
    expert: one(expertAccounts, {
      fields: [expertAstrologyServices.expert_id],
      references: [expertAccounts.id],
    }),
  }),
);

export type ExpertAstrologyServiceRow =
  typeof expertAstrologyServices.$inferSelect;
export type NewExpertAstrologyServiceRow =
  typeof expertAstrologyServices.$inferInsert;
