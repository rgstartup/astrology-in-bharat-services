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
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { clientAccounts } from '@/core/drizzledb/schema/client/client-account.schema';
import { consultationSessions } from '../session/consultation-session.schema';
import { consultationMessages } from '../message/consultation-message.schema';
import { consultationBillings } from '../billing/consultation-billing.schema';

const consultationsSchema = pgSchema('consultations');

export const consultationsModeEnum = pgEnum(
  'consultations_mode_enum',
  ConsultationMode,
);

export const consultationsStatusEnum = pgEnum(
  'consultations_status_enum',
  ConsultationStatus,
);

/**
 * Root aggregate of the redesigned consultation domain
 * (`consultations.consultations`). Drizzle-only; the legacy
 * `chat_sessions` / `call_sessions` TypeORM tables keep running alongside
 * until the module migrates and a later migration drops them.
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `expert_id` intentionally has NO FK (`expert.profile` is not migrated
 * to Drizzle), matching the legacy mirror convention. `client_id`
 * references `client.account` with cascade.
 */
export const consultations = consultationsSchema.table(
  'consultations',
  {
    id: serial('id').primaryKey(),
    client_id: integer('client_id')
      .notNull()
      .references(() => clientAccounts.id, { onDelete: 'cascade' }),
    expert_id: integer('expert_id').notNull(),
    mode: consultationsModeEnum('mode').notNull(),
    status: consultationsStatusEnum('status')
      .notNull()
      .default(ConsultationStatus.REQUESTED),
    requested_at: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    accepted_at: timestamp('accepted_at', { withTimezone: true }),
    started_at: timestamp('started_at', { withTimezone: true }),
    ended_at: timestamp('ended_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    /** Billable time accumulated across sessions, in seconds. */
    duration_seconds: integer('duration_seconds').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('consultations_client_id_idx').on(t.client_id),
    index('consultations_expert_id_idx').on(t.expert_id),
  ],
);

export const consultationsRelations = relations(
  consultations,
  ({ one, many }) => ({
    client: one(clientAccounts, {
      fields: [consultations.client_id],
      references: [clientAccounts.id],
    }),
    sessions: many(consultationSessions),
    messages: many(consultationMessages),
    billing: one(consultationBillings),
  }),
);

export type ConsultationRow = typeof consultations.$inferSelect;
export type NewConsultationRow = typeof consultations.$inferInsert;
