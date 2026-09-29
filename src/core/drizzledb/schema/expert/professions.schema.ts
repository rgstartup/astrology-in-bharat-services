import {
  boolean,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertProfessions } from './expert-professions.schema';
import { professionSpecializations } from './profession-specializations.schema';

const expertSchema = pgSchema('expert');

/**
 * Drizzle mirror of `Profession` (`expert.professions` TypeORM entity).
 * Source: src/internal/domains/expert/profession/entities/profession.entity.ts
 */
export const professions = expertSchema.table('professions', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const professionsRelations = relations(professions, ({ many }) => ({
  expert_professions: many(expertProfessions),
  profession_specializations: many(professionSpecializations),
}));

export type ProfessionRow = typeof professions.$inferSelect;
export type NewProfessionRow = typeof professions.$inferInsert;
