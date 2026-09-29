import { integer, pgSchema, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { professions } from './professions.schema';
import { specializations } from './specializations.schema';

const expertSchema = pgSchema('expert');

/**
 * Drizzle mirror of join table `expert.profession_specializations`.
 * Source: src/internal/domains/expert/profession/entities/profession.entity.ts
 */
export const professionSpecializations = expertSchema.table(
  'profession_specializations',
  {
    profession_id: integer('profession_id')
      .notNull()
      .references(() => professions.id, { onDelete: 'cascade' }),
    specialization_id: integer('specialization_id')
      .notNull()
      .references(() => specializations.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      name: 'PK_profession_specializations',
      columns: [table.profession_id, table.specialization_id],
    }),
  ],
);

export const professionSpecializationsRelations = relations(
  professionSpecializations,
  ({ one }) => ({
    profession: one(professions, {
      fields: [professionSpecializations.profession_id],
      references: [professions.id],
    }),
    specialization: one(specializations, {
      fields: [professionSpecializations.specialization_id],
      references: [specializations.id],
    }),
  }),
);

export type ProfessionSpecializationRow =
  typeof professionSpecializations.$inferSelect;
export type NewProfessionSpecializationRow =
  typeof professionSpecializations.$inferInsert;
