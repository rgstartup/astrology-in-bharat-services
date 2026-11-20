import {
  integer,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const paymentSchema = pgSchema('payments');

/**
 * Lifecycle of a payout platform account validation.
 *
 * - PENDING: account record created, validation not yet initiated
 * - INITIATED: penny-drop (₹1) sent to expert's bank; awaiting confirmation
 * - VALIDATED: expert confirmed the penny-drop amount; account ready for payouts
 * - FAILED: validation failed (wrong amount, bank rejected, etc.)
 */
export const payoutAccountValidationStatusEnum = pgEnum(
  'payout_account_validation_status_enum',
  ['PENDING', 'INITIATED', 'VALIDATED', 'FAILED'],
);

/**
 * Drizzle schema for a payout platform account (`payments.payout_platform_accounts`).
 *
 * Independent payout-account records — one per platform link attempt. Stores
 * platform-side identifiers (contact_id, fund_account_id) and bank account
 * details (masked account number, IFSC, bank name). The `platform` column
 * identifies which payout platform this account belongs to (e.g. 'razorpayx').
 *
 * Experts relate to these via `expert.expert_payout_platform_accounts`.
 */
export const payoutPlatformAccounts = paymentSchema.table(
  'payout_platform_accounts',
  {
    id: serial('id').primaryKey(),
    /** Payout platform identifier (e.g. 'razorpayx', 'cashfree', 'decentro'). */
    platform: text('platform').notNull(),
    /** Platform contact id (RazorpayX: contact id). */
    platformContactId: text('platform_contact_id'),
    /** Platform fund account id (RazorpayX: fund_account_id, unique). */
    platformFundId: text('platform_fund_id').unique(),
    /** Account type: 'bank_account' | 'vpa' | 'wallet'. */
    accountType: text('account_type').notNull().default('bank_account'),
    /** Bank name (nullable for VPA/wallet types). */
    bankName: text('bank_name'),
    /** Last 4 digits of the account number only — never store full PAN/number. */
    accountNumberMasked: text('account_number_masked'),
    /** IFSC code (nullable for VPA/wallet types). */
    ifsc: text('ifsc'),
    /** VPA address (nullable for bank account types). */
    vpa: text('vpa'),
    /** Penny-drop validation lifecycle status. */
    validationStatus: payoutAccountValidationStatusEnum('validation_status')
      .notNull()
      .default('PENDING'),
    /** Platform validation reference id (RazorpayX: validation id). */
    validationId: text('validation_id'),
    /** Human-readable failure reason, if validation failed. */
    failureReason: text('failure_reason'),
    /** Platform-specific extras stored verbatim (driver-decided shape). */
    metadata: json('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [],
);

export const payoutPlatformAccountsRelations = relations(
  payoutPlatformAccounts,
  ({}) => ({}),
);

export type PayoutPlatformAccountRow =
  typeof payoutPlatformAccounts.$inferSelect;
export type NewPayoutPlatformAccountRow =
  typeof payoutPlatformAccounts.$inferInsert;
