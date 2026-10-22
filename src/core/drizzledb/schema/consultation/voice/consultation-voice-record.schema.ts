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
import { SessionRecordingStatus } from '@/internal/consultation/enums';
import { consultationSessions } from '../session/consultation-session.schema';
import { consultationProviders } from '../provider/consultation-provider.schema';
import { media } from '@/core/drizzledb/schema/media/media.schema';

const consultationsSchema = pgSchema('consultations');

export const consultationRecordingStatusEnum = pgEnum(
  'consultation_recording_status_enum',
  SessionRecordingStatus,
);

/**
 * Voice recording of a session (`consultations.consultation_voice_records`).
 * One row per session (`session_id` UNIQUE — a new session starts a new
 * recording). Column-identical to `consultation_video_records` on purpose:
 * the split exists for query isolation (voice queries never scan video
 * rows), not for divergent fields. The stored artifact is a
 * `content.media` row via `media_id`; `provider_recording_id` is the
 * provider-side recording SID for reconciliation.
 */
export const consultationVoiceRecords = consultationsSchema.table(
  'consultation_voice_records',
  {
    id: serial('id').primaryKey(),
    session_id: integer('session_id')
      .notNull()
      .unique()
      .references(() => consultationSessions.id, { onDelete: 'cascade' }),
    provider_id: integer('provider_id').references(
      () => consultationProviders.id,
      { onDelete: 'set null' },
    ),
    media_id: integer('media_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    provider_recording_id: text('provider_recording_id'),
    duration_seconds: integer('duration_seconds').notNull().default(0),
    status: consultationRecordingStatusEnum('status')
      .notNull()
      .default(SessionRecordingStatus.PENDING),
    started_at: timestamp('started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('consultation_voice_records_session_id_idx').on(t.session_id)],
);

export const consultationVoiceRecordsRelations = relations(
  consultationVoiceRecords,
  ({ one }) => ({
    session: one(consultationSessions, {
      fields: [consultationVoiceRecords.session_id],
      references: [consultationSessions.id],
    }),
    provider: one(consultationProviders, {
      fields: [consultationVoiceRecords.provider_id],
      references: [consultationProviders.id],
    }),
    media: one(media, {
      fields: [consultationVoiceRecords.media_id],
      references: [media.id],
    }),
  }),
);

export type ConsultationVoiceRecordRow =
  typeof consultationVoiceRecords.$inferSelect;
export type NewConsultationVoiceRecordRow =
  typeof consultationVoiceRecords.$inferInsert;
