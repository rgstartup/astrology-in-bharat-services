import {
  boolean,
  doublePrecision,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  CallSessionStatus,
  CallType,
} from '../../../../../internal/consultation/call/enum';
import { clientAccounts } from '../../client/client-account.schema';

const consultationsSchema = pgSchema('consultations');

export const callSessionStatusEnum = pgEnum(
  'call_sessions_status_enum',
  CallSessionStatus,
);

export const callSessionTypeEnum = pgEnum('call_sessions_type_enum', CallType);

/**
 * Drizzle mirror of `CallSession` (`consultations.call_sessions` TypeORM entity).
 * Source: src/internal/consultation/call/entities/call-session.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `numeric` columns come back as strings from the driver — normalize to
 * number in a co-located mapper at the use-case boundary.
 * Legacy `float` columns map to `doublePrecision` (float8).
 *
 * Notes:
 * - PG enum type names (`call_sessions_status_enum`,
 *   `call_sessions_type_enum`) match the TypeORM-generated types; do not
 *   rename without a DB migration.
 * - `expert_id` intentionally has NO FK yet (`expert.profile` is not
 *   migrated to Drizzle). `agent_id` has no legacy relation either.
 *   `client_id` references `client.account` with cascade, matching the
 *   TypeORM entity.
 */
export const callSessions = consultationsSchema.table('call_sessions', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  expert_id: integer('expert_id').notNull(),
  start_time: timestamp('start_time', { withTimezone: true }),
  end_time: timestamp('end_time', { withTimezone: true }),
  status: callSessionStatusEnum('status')
    .notNull()
    .default(CallSessionStatus.PENDING),
  type: callSessionTypeEnum('type').notNull().default(CallType.AUDIO),
  is_free: boolean('is_free').notNull().default(false),
  free_minutes: integer('free_minutes').notNull().default(0),
  price_per_minute: doublePrecision('price_per_minute').notNull(),
  total_cost: doublePrecision('total_cost').notNull().default(0),
  expert_earning: numeric('expert_earning', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  agent_id: integer('agent_id'),
  agent_commission: numeric('agent_commission', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  platform_fee: numeric('platform_fee', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  gst: numeric('gst', { precision: 10, scale: 2 }).notNull().default('0'),
  twilio_sid: text('twilio_sid'),
  twilio_room_id: text('twilio_room_id'),
  duration_seconds: integer('duration_seconds').notNull().default(0),
  final_price: doublePrecision('final_price').notNull().default(0),
  max_duration_seconds: integer('max_duration_seconds').notNull().default(0),
  terminated_by: text('terminated_by'),
  terminated_reason: text('terminated_reason'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const callSessionsRelations = relations(callSessions, ({ one }) => ({
  client: one(clientAccounts, {
    fields: [callSessions.client_id],
    references: [clientAccounts.id],
  }),
}));

export type CallSessionRow = typeof callSessions.$inferSelect;
export type NewCallSessionRow = typeof callSessions.$inferInsert;
