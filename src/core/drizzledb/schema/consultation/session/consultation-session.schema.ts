import {
  index,
  integer,
  pgEnum,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  ConsultationMode,
  ConsultationSessionStatus,
} from '@/internal/consultation/enums';
import { consultations } from '../consultation/consultation.schema';
import { sessionProviders } from './session-provider.schema';
import { sessionRecordings } from './session-recording.schema';

const consultationsSchema = pgSchema('consultations');

export const consultationSessionsStatusEnum = pgEnum(
  'consultation_sessions_status_enum',
  ConsultationSessionStatus,
);

export const consultationSessionsModeEnum = pgEnum(
  'consultation_sessions_mode_enum',
  ConsultationMode,
);

/**
 * A single connection attempt under a consultation
 * (`consultations.consultation_sessions`). A consultation may own several
 * sessions (e.g. reconnect after a drop); billable time is derived from
 * these rows into `consultation_billings`.
 */
export const consultationSessions = consultationsSchema.table(
  'consultation_sessions',
  {
    id: serial('id').primaryKey(),
    consultation_id: integer('consultation_id')
      .notNull()
      .references(() => consultations.id, { onDelete: 'cascade' }),
    mode: consultationSessionsModeEnum('mode').notNull(),
    status: consultationSessionsStatusEnum('status')
      .notNull()
      .default(ConsultationSessionStatus.PENDING),
    started_at: timestamp('started_at', { withTimezone: true }),
    ended_at: timestamp('ended_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('consultation_sessions_consultation_id_idx').on(t.consultation_id),
  ],
);

export const consultationSessionsRelations = relations(
  consultationSessions,
  ({ one, many }) => ({
    consultation: one(consultations, {
      fields: [consultationSessions.consultation_id],
      references: [consultations.id],
    }),
    providers: many(sessionProviders),
    recordings: many(sessionRecordings),
  }),
);

export type ConsultationSessionRow = typeof consultationSessions.$inferSelect;
export type NewConsultationSessionRow =
  typeof consultationSessions.$inferInsert;
