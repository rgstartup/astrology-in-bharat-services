import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ChatSessionStatus } from '@/internal/consultation/chat/enum';
import { clientAccounts } from '../../client/client-account.schema';
import { chatMessages } from './chat-message.schema';

const consultationsSchema = pgSchema('consultations');

export const chatSessionStatusEnum = pgEnum(
  'chat_sessions_status_enum',
  ChatSessionStatus,
);

/**
 * Drizzle mirror of `ChatSession` (`consultations.chat_sessions` TypeORM entity).
 * Source: src/internal/consultation/chat/entities/chat-session.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `numeric` columns come back as strings from the driver — normalize to
 * number in a co-located mapper at the use-case boundary.
 * Legacy `float` columns map to `doublePrecision` (float8).
 *
 * Notes:
 * - PG enum type name (`chat_sessions_status_enum`) matches the
 *   TypeORM-generated type; do not rename without a DB migration.
 * - `expert_id` intentionally has NO FK yet (`expert.profile` is not
 *   migrated to Drizzle). `agent_id` has no legacy relation either.
 *   `client_id` references `client.account` with cascade, matching the
 *   TypeORM entity.
 */
export const chatSessions = consultationsSchema.table('chat_sessions', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  expert_id: integer('expert_id').notNull(),
  start_time: timestamp('start_time', { withTimezone: true }),
  end_time: timestamp('end_time', { withTimezone: true }),
  status: chatSessionStatusEnum('status')
    .notNull()
    .default(ChatSessionStatus.PENDING),
  terminated_by: text('terminated_by'),
  terminated_reason: text('terminated_reason'),
  session_type: text('session_type').notNull().default('chat'),
  is_recording: boolean('is_recording').notNull().default(false),
  connection_quality: text('connection_quality').notNull().default('excellent'),
  is_free: boolean('is_free').notNull().default(false),
  free_minutes: integer('free_minutes').notNull().default(0),
  price_per_minute: doublePrecision('price_per_minute').notNull().default(0),
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
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  max_duration_seconds: integer('max_duration_seconds').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatSessionsRelations = relations(
  chatSessions,
  ({ one, many }) => ({
    client: one(clientAccounts, {
      fields: [chatSessions.client_id],
      references: [clientAccounts.id],
    }),
    messages: many(chatMessages),
  }),
);

export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type NewChatSessionRow = typeof chatSessions.$inferInsert;
