import {
  boolean,
  integer,
  pgSchema,
  serial,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertAccounts } from './expert-account.schema';
import { professions } from './professions.schema';

const expertSchema = pgSchema('expert');

/**
 * Drizzle mirror of `ExpertProfession` (`expert.expert_professions` TypeORM entity).
 * Source: src/internal/domains/expert/profession/entities/expert-profession.entity.ts
 */
export const expertProfessions = expertSchema.table(
  'expert_professions',
  {
    id: serial('id').primaryKey(),
    expert_id: integer('expert_id')
      .notNull()
      .references(() => expertAccounts.id, { onDelete: 'cascade' }),
    profession_id: integer('profession_id')
      .notNull()
      .references(() => professions.id, { onDelete: 'cascade' }),
    is_primary: boolean('is_primary').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('UQ_expert_profession').on(
      table.expert_id,
      table.profession_id,
    ),
  ],
);

export const expertProfessionsRelations = relations(
  expertProfessions,
  ({ one }) => ({
    expert: one(expertAccounts, {
      fields: [expertProfessions.expert_id],
      references: [expertAccounts.id],
    }),
    profession: one(professions, {
      fields: [expertProfessions.profession_id],
      references: [professions.id],
    }),
  }),
);

export type ExpertProfessionRow = typeof expertProfessions.$inferSelect;
export type NewExpertProfessionRow = typeof expertProfessions.$inferInsert;
