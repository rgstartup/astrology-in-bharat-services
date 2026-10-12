import {
  integer,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const commonSchema = pgSchema('common');

/**
 * Cross-domain idempotency ledger (`common.idempotency_keys`).
 * Generic retry guard for client-retryable mutations (chat attachment
 * sends, uploads, etc.) — keyed by actor + scope + client-supplied key.
 * Deliberately separate from the finance-scoped `finance.idempotency_keys`
 * mirror, which stays wallet-specific.
 */
export const commonIdempotencyKeys = commonSchema.table(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    actorType: varchar('actor_type', { length: 20 }).notNull(),
    actorId: integer('actor_id').notNull(),

    scope: varchar('scope', { length: 100 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),

    status: varchar('status', { length: 20 }).notNull().default('processing'),

    resourceType: varchar('resource_type', { length: 50 }),
    resourceId: integer('resource_id'),

    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<Record<
      string,
      unknown
    > | null>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idempotency_keys_actor_scope_key_unique').on(
      table.actorType,
      table.actorId,
      table.scope,
      table.idempotencyKey,
    ),
  ],
);

export type CommonIdempotencyKeyRow =
  typeof commonIdempotencyKeys.$inferSelect;
export type NewCommonIdempotencyKeyRow =
  typeof commonIdempotencyKeys.$inferInsert;
