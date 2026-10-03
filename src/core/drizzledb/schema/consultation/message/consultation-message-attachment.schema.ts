import {
  index,
  integer,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { consultationMessages } from './consultation-message.schema';
import { media } from '@/core/drizzledb/schema/media/media.schema';

const consultationsSchema = pgSchema('consultations');

/**
 * Attachments of a consultation message
 * (`consultations.consultation_message_attachments`). The stored file
 * itself is a `content.media` row referenced via `media_id` — no inline
 * URLs, unlike the legacy `chat_messages.attachment_url` columns.
 */
export const consultationMessageAttachments = consultationsSchema.table(
  'consultation_message_attachments',
  {
    id: serial('id').primaryKey(),
    message_id: integer('message_id')
      .notNull()
      .references(() => consultationMessages.id, { onDelete: 'cascade' }),
    media_id: integer('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'restrict' }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('consultation_message_attachments_message_id_idx').on(t.message_id)],
);

export const consultationMessageAttachmentsRelations = relations(
  consultationMessageAttachments,
  ({ one }) => ({
    message: one(consultationMessages, {
      fields: [consultationMessageAttachments.message_id],
      references: [consultationMessages.id],
    }),
    media: one(media, {
      fields: [consultationMessageAttachments.media_id],
      references: [media.id],
    }),
  }),
);

export type ConsultationMessageAttachmentRow =
  typeof consultationMessageAttachments.$inferSelect;
export type NewConsultationMessageAttachmentRow =
  typeof consultationMessageAttachments.$inferInsert;
