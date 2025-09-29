import { pgTable, integer, text, index, pgEnum } from 'drizzle-orm/pg-core';
import { timestampTz } from './helper';
import { user } from './auth.schema';

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

export const client = pgTable(
  'client',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    user_id: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    date_of_birth: timestampTz('date_of_birth'),
    gender: genderEnum('gender'),
    created_at: timestampTz('created_at').defaultNow().notNull(),
  },
  (table) => [index('user_client_idx').on(table.user_id)],
);

export type Client = typeof client.$inferSelect;
