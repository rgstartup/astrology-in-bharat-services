import {
  boolean,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertSpecializations } from './expert-specializations.schema';
import { professionSpecializations } from './profession-specializations.schema';

const expertSchema = pgSchema('expert');

/**
 * Drizzle mirror of `Specialization` (`expert.specializations` TypeORM entity).
 * Source: src/internal/domains/expert/specialization/entities/specialization.entity.ts
 */
export const specializations = expertSchema.table('specializations', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  slug: text('slug').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const specializationsRelations = relations(
  specializations,
  ({ many }) => ({
    expert_specializations: many(expertSpecializations),
    profession_specializations: many(professionSpecializations),
  }),
);

export type SpecializationRow = typeof specializations.$inferSelect;
export type NewSpecializationRow = typeof specializations.$inferInsert;
