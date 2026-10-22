import {
  boolean,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const consultationsSchema = pgSchema('consultations');

/**
 * Provider catalog for consultations (`consultations.consultation_providers`).
 * Session-free by design: stores provider-level info only (code, display
 * name, provider-wide config, active flag). Per-attempt linkage lives on
 * the voice/video record rows via `provider_id`, so swapping or disabling
 * a provider never rewrites session history.
 */
export const consultationProviders = consultationsSchema.table(
  'consultation_providers',
  {
    id: serial('id').primaryKey(),
    /** Stable provider key (e.g. `twilio`, `agora`). */
    code: text('code').notNull().unique(),
    /** Display name for admin tooling. */
    name: text('name').notNull(),
    /** Provider-wide config (endpoints, default region, feature flags). */
    config: jsonb('config').$type<Record<string, unknown> | null>(),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type ConsultationProviderRow =
  typeof consultationProviders.$inferSelect;
export type NewConsultationProviderRow =
  typeof consultationProviders.$inferInsert;
