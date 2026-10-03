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
import { consultationSessions } from './consultation-session.schema';
import { media } from '@/core/drizzledb/schema/media/media.schema';

const consultationsSchema = pgSchema('consultations');

export const sessionRecordingsStatusEnum = pgEnum(
  'session_recordings_status_enum',
  SessionRecordingStatus,
);

/**
 * Recordings of a session (`consultations.session_recordings`).
 * The stored artifact itself is a `content.media` row referenced via
 * `media_id`; `provider_recording_id` is the provider-side recording SID
 * (e.g. Twilio recording SID) for reconciliation.
 */
export const sessionRecordings = consultationsSchema.table(
  'session_recordings',
  {
    id: serial('id').primaryKey(),
    session_id: integer('session_id')
      .notNull()
      .references(() => consultationSessions.id, { onDelete: 'cascade' }),
    media_id: integer('media_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    provider_recording_id: text('provider_recording_id'),
    duration_seconds: integer('duration_seconds').notNull().default(0),
    status: sessionRecordingsStatusEnum('status')
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
  (t) => [index('session_recordings_session_id_idx').on(t.session_id)],
);

export const sessionRecordingsRelations = relations(
  sessionRecordings,
  ({ one }) => ({
    session: one(consultationSessions, {
      fields: [sessionRecordings.session_id],
      references: [consultationSessions.id],
    }),
    media: one(media, {
      fields: [sessionRecordings.media_id],
      references: [media.id],
    }),
  }),
);

export type SessionRecordingRow = typeof sessionRecordings.$inferSelect;
export type NewSessionRecordingRow = typeof sessionRecordings.$inferInsert;
