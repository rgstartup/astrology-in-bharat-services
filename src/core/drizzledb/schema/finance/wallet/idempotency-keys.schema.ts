import {
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../../client/client-account.schema';
import { expertAccounts } from '../../expert/expert-account.schema';

const financeSchema = pgSchema('finance');

/**
 * Drizzle mirror of `Idempotency` (`finance.idempotency_keys` TypeORM entity).
 * Source: src/internal/finance/wallet/entities/idempotency.entity.ts
 */
export const idempotencyKeys = financeSchema.table('idempotency_keys', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(),
  client_id: integer('client_id').references(() => clientAccounts.id, {
    onDelete: 'set null',
  }),
  expert_id: integer('expert_id').references(() => expertAccounts.id, {
    onDelete: 'set null',
  }),
  merchant_id: integer('merchant_id'),
  agent_id: integer('agent_id'),
  payload_hash: text('payload_hash'),
  response_payload: jsonb('response_payload').$type<Record<
    string,
    unknown
  > | null>(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const idempotencyKeysRelations = relations(
  idempotencyKeys,
  ({ one }) => ({
    client: one(clientAccounts, {
      fields: [idempotencyKeys.client_id],
      references: [clientAccounts.id],
    }),
    expert: one(expertAccounts, {
      fields: [idempotencyKeys.expert_id],
      references: [expertAccounts.id],
    }),
  }),
);

export type IdempotencyKeyRow = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKeyRow = typeof idempotencyKeys.$inferInsert;
