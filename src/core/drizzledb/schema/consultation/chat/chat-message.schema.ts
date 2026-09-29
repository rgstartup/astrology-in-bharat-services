import {
  integer,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { MessageType } from '../../../../../internal/consultation/chat/enum';
import { chatSessions } from './chat-session.schema';

const consultationsSchema = pgSchema('consultations');

export const chatMessageTypeEnum = pgEnum(
  'chat_messages_type_enum',
  MessageType,
);

/**
 * Drizzle mirror of `ChatMessage` (`consultations.chat_messages` TypeORM entity).
 * Source: src/internal/consultation/chat/entities/chat-message.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 *
 * Notes:
 * - PG enum type name (`chat_messages_type_enum`) matches the
 *   TypeORM-generated type; do not rename without a DB migration.
 * - Legacy has no `updated_at`; only `created_at` is mirrored.
 * - `sender_id`/`sender_type` intentionally have NO FK (polymorphic
 *   client-or-expert sender, no legacy relation).
 */
export const chatMessages = consultationsSchema.table('chat_messages', {
  id: serial('id').primaryKey(),
  session_id: integer('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  sender_id: integer('sender_id').notNull(),
  sender_type: text('sender_type').notNull(),
  content: text('content').notNull(),
  type: chatMessageTypeEnum('type').notNull().default(MessageType.TEXT),
  attachment_url: text('attachment_url'),
  attachment_type: text('attachment_type'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.session_id],
    references: [chatSessions.id],
  }),
}));

export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type NewChatMessageRow = typeof chatMessages.$inferInsert;
