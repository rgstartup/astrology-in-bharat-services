/**
 * Execute a payout from an expert's linked payout account.
 *
 * 1. Resolves the expert's payout account (via expert_payout_account_links).
 * 2. Creates a payouts row with an idempotency key (status 'created').
 * 3. Resolves the provider via PayoutProviderResolver (from provider account).
 * 4. Calls provider.createPayout() to move money.
 * 5. Updates the payouts row with provider reference and normalized status.
 */
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { eq, and } from 'drizzle-orm';
import {
  payoutAccounts,
  payouts,
  payoutAccountReferences,
  expertPayoutAccountLinks,
  paymentProviders,
  payoutProviderAccounts,
} from '@/core/drizzledb/schema';
import { PayoutProviderService } from '../payout-provider.service';
import type { CreatePayoutInput } from '@/external/payout-onboarding/payout-provider.interface';
import {
  PayoutAccountNotLinkedError,
  PayoutAccountNotFoundError,
  PayoutAccountNotActiveError,
  NoProviderAccountConfiguredError,
  NoFundAccountReferenceError,
  PayoutExecutionFailedError,
} from '../errors';

export interface ExecutePayoutInput {
  expertId: number;
  payoutAccountId: number;
  amount: number; // minor units (paise for INR)
  currencyCode?: string;
  narration?: string;
  idempotencyKey?: string;
}

export interface ExecutePayoutOutput {
  payoutId: number;
  providerPayoutReference: string;
  status: string;
}

@Injectable()
export class ExecutePayoutUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly providerService: PayoutProviderService,
  ) {}

  async execute(input: ExecutePayoutInput): Promise<ExecutePayoutOutput> {
    // Verify the payout account belongs to this expert and is active.
    const [link] = await this.db
      .select({ payoutAccountId: expertPayoutAccountLinks.payout_account_id })
      .from(expertPayoutAccountLinks)
      .where(
        and(
          eq(expertPayoutAccountLinks.expert_id, input.expertId),
          eq(expertPayoutAccountLinks.payout_account_id, input.payoutAccountId),
        ),
      )
      .limit(1);

    if (!link) {
      throw new PayoutAccountNotLinkedError(input.payoutAccountId, input.expertId);
    }

    const [account] = await this.db
      .select({
        id: payoutAccounts.id,
        payout_provider_account_id: payoutAccounts.payout_provider_account_id,
        status: payoutAccounts.status,
      })
      .from(payoutAccounts)
      .where(eq(payoutAccounts.id, input.payoutAccountId))
      .limit(1);

    if (!account) {
      throw new PayoutAccountNotFoundError(input.payoutAccountId);
    }

    if (account.status !== 'active') {
      throw new PayoutAccountNotActiveError(account.status);
    }

    // Idempotency key: caller-provided or derived from expert + account + amount.
    const idempotencyKey =
      input.idempotencyKey ??
      `payout:${input.expertId}:${input.payoutAccountId}:${input.amount}:${input.currencyCode ?? 'INR'}`;

    // Check for existing payout with this idempotency key.
    const [existing] = await this.db
      .select({ id: payouts.id, status: payouts.status, providerPayoutReference: payouts.provider_payout_reference })
      .from(payouts)
      .where(eq(payouts.idempotency_key, idempotencyKey))
      .limit(1);

    if (existing) {
      return {
        payoutId: existing.id,
        providerPayoutReference: existing.providerPayoutReference ?? '',
        status: existing.status,
      };
    }

    // Resolve provider via the provider account config linked to this payout account.
    const [providerAccount] = await this.db
      .select({ code: paymentProviders.code })
      .from(payoutProviderAccounts)
      .innerJoin(
        paymentProviders,
        eq(payoutProviderAccounts.provider_id, paymentProviders.id),
      )
      .where(eq(payoutProviderAccounts.id, account.payout_provider_account_id))
      .limit(1);

    if (!providerAccount) {
      throw new NoProviderAccountConfiguredError(input.payoutAccountId);
    }

    const provider = this.providerService.resolve(providerAccount.code);

    // Create the payouts row (status 'created') before calling the provider.
    const [payoutRow] = await this.db
      .insert(payouts)
      .values({
        payout_account_id: input.payoutAccountId,
        payout_provider_account_id: account.payout_provider_account_id,
        amount: input.amount,
        currency_code: input.currencyCode ?? 'INR',
        status: 'created',
        idempotency_key: idempotencyKey,
        provider_payout_reference: null,
        failure_code: null,
        failure_message: null,
        initiated_at: new Date(),
        processed_at: null,
        completed_at: null,
        failed_at: null,
        metadata: null,
      })
      .returning();

    // Call the provider to execute the payout.

    // Resolve destination (fund_account reference) from payout_account_references.
    const [ref] = await this.db
      .select({ providerReference: payoutAccountReferences.provider_reference })
      .from(payoutAccountReferences)
      .where(
        and(
          eq(payoutAccountReferences.payout_account_id, input.payoutAccountId),
          eq(payoutAccountReferences.reference_type, 'fund_account'),
        ),
      )
      .limit(1);

    if (!ref) {
      throw new NoFundAccountReferenceError(input.payoutAccountId);
    }

    const providerInput: CreatePayoutInput = {
      payoutId: payoutRow.id,
      amount: input.amount,
      currency: input.currencyCode ?? 'INR',
      destinationId: ref.providerReference,
      narration: input.narration,
      idempotencyKey,
    };

    let providerOutput;
    try {
      providerOutput = await provider.createPayout(providerInput);
    } catch (error: unknown) {
      await this.db
        .update(payouts)
        .set({
          status: 'failed',
          failure_code: 'provider_create_payout_failed',
          failure_message:
            error instanceof Error ? error.message : String(error),
          failed_at: new Date(),
        })
        .where(eq(payouts.id, payoutRow.id));
      throw new PayoutExecutionFailedError(
        error instanceof Error ? error.message : String(error),
      );
    }

    // Update payouts row with provider reference and normalized status.
    await this.db
      .update(payouts)
      .set({
        provider_payout_reference: providerOutput.providerPayoutReference,
        status: providerOutput.status,
        processed_at: new Date(),
        completed_at:
          providerOutput.status === 'completed' ? new Date() : null,
        failed_at:
          providerOutput.status === 'failed' ? new Date() : null,
      })
      .where(eq(payouts.id, payoutRow.id));

    return {
      payoutId: payoutRow.id,
      providerPayoutReference: providerOutput.providerPayoutReference,
      status: providerOutput.status,
    };
  }
}
