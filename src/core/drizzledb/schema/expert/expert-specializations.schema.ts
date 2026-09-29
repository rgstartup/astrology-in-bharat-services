import {
  integer,
  pgSchema,
  serial,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertAccounts } from './expert-account.schema';
import { specializations } from './specializations.schema';

const expertSchema = pgSchema('expert');

/**
 * Drizzle mirror of `ExpertSpecialization` (`expert.expert_specializations` TypeORM entity).
 * Source: src/internal/domains/expert/account/entities/expert-specialization.entity.ts
 */
export const expertSpecializations = expertSchema.table(
  'expert_specializations',
  {
    id: serial('id').primaryKey(),
    expert_id: integer('expert_id')
      .notNull()
      .references(() => expertAccounts.id, { onDelete: 'cascade' }),
    specialization_id: integer('specialization_id')
      .notNull()
      .references(() => specializations.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('UQ_expert_specialization').on(
      table.expert_id,
      table.specialization_id,
    ),
  ],
);

export const expertSpecializationsRelations = relations(
  expertSpecializations,
  ({ one }) => ({
    expert: one(expertAccounts, {
      fields: [expertSpecializations.expert_id],
      references: [expertAccounts.id],
    }),
    specialization: one(specializations, {
      fields: [expertSpecializations.specialization_id],
      references: [specializations.id],
    }),
  }),
);

export type ExpertSpecializationRow = typeof expertSpecializations.$inferSelect;
export type NewExpertSpecializationRow =
  typeof expertSpecializations.$inferInsert;
