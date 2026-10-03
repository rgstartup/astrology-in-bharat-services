import {
  index,
  integer,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { MessageType } from '@/internal/consultation/chat/enum';
import { consultations } from '../consultation/consultation.schema';
import { consultationMessageAttachments } from './consultation-message-attachment.schema';

const consultationsSchema = pgSchema('consultations');

export const consultationMessagesTypeEnum = pgEnum(
  'consultation_messages_type_enum',
  MessageType,
);

/**
 * Chat messages of a consultation (`consultations.consultation_messages`).
 * Attached to the consultation (not the session) so history survives
 * reconnects that spawn new `consultation_sessions` rows.
 *
 * `sender_id` is polymorphic (client `account.id` or `profile_expert.id`),
 * disambiguated by `sender_type` (`client` | `expert`) — same convention
 * as the legacy `chat_messages` table. `sent_at` is the client-claimed
 * send time; `created_at` is the server persist time.
 */
export const consultationMessages = consultationsSchema.table(
  'consultation_messages',
  {
    id: serial('id').primaryKey(),
    consultation_id: integer('consultation_id')
      .notNull()
      .references(() => consultations.id, { onDelete: 'cascade' }),
    sender_id: integer('sender_id').notNull(),
    sender_type: text('sender_type').notNull(),
    message_type: consultationMessagesTypeEnum('message_type')
      .notNull()
      .default(MessageType.TEXT),
    content: text('content').notNull(),
    sent_at: timestamp('sent_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('consultation_messages_consultation_id_idx').on(t.consultation_id),
  ],
);

export const consultationMessagesRelations = relations(
  consultationMessages,
  ({ one, many }) => ({
    consultation: one(consultations, {
      fields: [consultationMessages.consultation_id],
      references: [consultations.id],
    }),
    attachments: many(consultationMessageAttachments),
  }),
);

export type ConsultationMessageRow = typeof consultationMessages.$inferSelect;
export type NewConsultationMessageRow =
  typeof consultationMessages.$inferInsert;
