import { pgSchema, serial, text, timestamp } from 'drizzle-orm/pg-core';

const consultationsSchema = pgSchema('consultations');

/**
 * Drizzle mirror of the legacy `Quote` entity in `consultations.quotes`.
 * JavaScript column keys match the database's snake_case identifiers.
 */
export const quotes = consultationsSchema.table('quotes', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  author: text('author'),
  source: text('source'),
  meaning: text('meaning'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type QuoteRow = typeof quotes.$inferSelect;
export type NewQuoteRow = typeof quotes.$inferInsert;
