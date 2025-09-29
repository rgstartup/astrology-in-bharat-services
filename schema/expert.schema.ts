import {
  pgTable,
  integer,
  text,
  index,
  check,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { timestampTz } from './helper';
import { user } from './auth.schema';
import { sql } from 'drizzle-orm';

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

export const expert = pgTable(
  'expert',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    user_id: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    bio: text('bio'),
    experience_years: integer('experience_years'),
    gender: genderEnum('gender'),
    created_at: timestampTz('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_expert_idx').on(table.user_id),
    check(
      'experience_years_limit',
      sql`${table.experience_years} between 1 and 60`,
    ),
  ],
);

export type Expert = typeof expert.$inferSelect;
