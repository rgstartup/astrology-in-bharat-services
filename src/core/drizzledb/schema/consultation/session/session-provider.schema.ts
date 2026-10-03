import {
  index,
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { consultationSessions } from './consultation-session.schema';

const consultationsSchema = pgSchema('consultations');

/**
 * Provider linkage for a session (`consultations.session_providers`).
 * Provider-agnostic by design: `provider` names the backend
 * (e.g. `twilio`), `provider_session_id` is the provider-side room/call
 * SID, `status` carries the provider-side state verbatim, and `metadata`
 * holds anything else (timers, tokens refs, webhook payloads).
 */
export const sessionProviders = consultationsSchema.table(
  'session_providers',
  {
    id: serial('id').primaryKey(),
    session_id: integer('session_id')
      .notNull()
      .references(() => consultationSessions.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    provider_session_id: text('provider_session_id'),
    status: text('status'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('session_providers_session_id_idx').on(t.session_id)],
);

export const sessionProvidersRelations = relations(
  sessionProviders,
  ({ one }) => ({
    session: one(consultationSessions, {
      fields: [sessionProviders.session_id],
      references: [consultationSessions.id],
    }),
  }),
);

export type SessionProviderRow = typeof sessionProviders.$inferSelect;
export type NewSessionProviderRow = typeof sessionProviders.$inferInsert;
