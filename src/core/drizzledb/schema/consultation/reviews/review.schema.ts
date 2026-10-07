import {
  doublePrecision,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../../client/client-account.schema';
import { orders } from '../../commerce/order/order.schema';
import { callSessions } from '../call/call-session.schema';
import { consultationSessions } from '../session/consultation-session.schema';

const consultationsSchema = pgSchema('consultations');

/**
 * Drizzle mirror of `Review` (`consultations.reviews` TypeORM entity).
 * Source: src/internal/consultation/reviews/entities/review.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * Legacy `float` rating maps to `doublePrecision` (float8).
 * Legacy `simple-array` tags map to plain `text` (same PG storage);
 * split/join in a co-located mapper at the use-case boundary.
 *
 * Notes:
 * - `expert_id` / `merchant_id` intentionally have NO FK yet (those
 *   profiles are not migrated to Drizzle). `client_id` references
 *   `client.account` with cascade, matching the TypeORM entity.
 * - Nullable legacy relations (`order`, `session`, `callSession`) use
 *   `onDelete: 'set null'`, matching the order-item convention.
 * - Legacy has no `updated_at`; only `created_at` is mirrored.
 */
export const reviews = consultationsSchema.table('reviews', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  order_id: integer('order_id').references(() => orders.id, {
    onDelete: 'set null',
  }),
  expert_id: integer('expert_id'),
  merchant_id: integer('merchant_id'),
  session_id: integer('session_id').references(() => consultationSessions.id, {
    onDelete: 'set null',
  }),
  call_session_id: integer('call_session_id').references(
    () => callSessions.id,
    {
      onDelete: 'set null',
    },
  ),
  rating: doublePrecision('rating').notNull(),
  comment: text('comment'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  review_type: varchar('review_type', { length: 20 })
    .notNull()
    .default('expert'),
  tags: text('tags'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  client: one(clientAccounts, {
    fields: [reviews.client_id],
    references: [clientAccounts.id],
  }),
  order: one(orders, {
    fields: [reviews.order_id],
    references: [orders.id],
  }),
  session: one(consultationSessions, {
    fields: [reviews.session_id],
    references: [consultationSessions.id],
  }),
  callSession: one(callSessions, {
    fields: [reviews.call_session_id],
    references: [callSessions.id],
  }),
}));

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
