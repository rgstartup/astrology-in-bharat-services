import {
  boolean,
  integer,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../client/client-account.schema';

const supportSchema = pgSchema('support');

/**
 * Mirrors `NotificationType` from
 * `src/internal/notification/entities/notification.entity.ts`.
 *
 * Declared here (not imported from the entity file) so `drizzle-kit
 * generate` never loads the TypeORM entity graph. Follow-up: extract the
 * entity's enum to a plain `src/internal/notification/enums/` module (as was
 * done for `OtpPurposeEnum`) and import it here instead.
 */
export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_PLACED = 'order_placed',
  ORDER_PACKED = 'order_packed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  WALLET_RECHARGE = 'wallet_recharge',
  PUJA_BOOKING = 'puja_booking',
  GENERAL = 'general',
}

export const notificationTypeEnum = pgEnum(
  'notifications_type_enum',
  NotificationType,
);

/**
 * Drizzle mirror of `Notification` (`support.notifications` TypeORM entity).
 * Source: src/internal/notification/entities/notification.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 *
 * Notes:
 * - PG enum type name (`notifications_type_enum`) matches the
 *   TypeORM-generated type; do not rename without a DB migration.
 * - `expert_id`, `merchant_id`, `agent_id` intentionally have NO FK yet
 *   (those profiles are not migrated to Drizzle). `client_id` references
 *   `client.account` with cascade, matching the TypeORM entity.
 */
export const notifications = supportSchema.table('notifications', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').references(() => clientAccounts.id, {
    onDelete: 'cascade',
  }),
  expert_id: integer('expert_id'),
  merchant_id: integer('merchant_id'),
  agent_id: integer('agent_id'),
  type: notificationTypeEnum('type').default(NotificationType.GENERAL),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  metadata: json('metadata').$type<Record<string, unknown> | null>(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  client: one(clientAccounts, {
    fields: [notifications.client_id],
    references: [clientAccounts.id],
  }),
}));

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
