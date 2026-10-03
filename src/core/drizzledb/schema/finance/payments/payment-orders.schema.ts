import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../../client/client-account.schema';
import { PaymentStatus } from '@/core/enums';

const financeSchema = pgSchema('finance');

export const paymentOrderStatusEnum = pgEnum(
  'finance_payment_orders_status_enum',
  PaymentStatus,
);

/**
 * Drizzle mirror of `PaymentOrder` (`finance.payment_orders` TypeORM entity).
 * Source: src/internal/finance/payments/entities/payment-order.entity.ts
 */
export const paymentOrders = financeSchema.table('payment_orders', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').references(() => clientAccounts.id, {
    onDelete: 'set null',
  }),
  razorpay_order_id: text('razorpay_order_id').unique(),
  razorpay_payment_id: text('razorpay_payment_id').unique(),
  razorpay_signature: text('razorpay_signature'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: paymentOrderStatusEnum('status')
    .notNull()
    .default(PaymentStatus.PENDING),
  notes: jsonb('notes').$type<Record<string, unknown> | null>(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paymentOrdersRelations = relations(paymentOrders, ({ one }) => ({
  client: one(clientAccounts, {
    fields: [paymentOrders.client_id],
    references: [clientAccounts.id],
  }),
}));

export type PaymentOrderRow = typeof paymentOrders.$inferSelect;
export type NewPaymentOrderRow = typeof paymentOrders.$inferInsert;
