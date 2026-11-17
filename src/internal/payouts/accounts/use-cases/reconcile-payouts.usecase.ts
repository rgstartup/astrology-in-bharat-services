/**
 * Reconcile internal payout records against provider state.
 *
 * Fetches payouts with a provider_payout_reference whose internal status is
 * in a reconcilable state, queries the provider for the current status of
 * each, and updates internal records where they diverge. Returns a summary
 * of checked/updated/mismatched/errored payouts.
 *
 * Idempotent: safe to run on a schedule (e.g. hourly cron).
 */
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { eq, inArray, isNotNull, and } from 'drizzle-orm';
import {
  payouts,
  payoutProviderAccounts,
  paymentProviders,
} from '@/core/drizzledb/schema';
import { PayoutProviderService } from '../payout-provider.service';

/** Internal payout statuses worth reconciling. Excludes terminal states
 *  that shouldn't change (cancelled, reversed). */
const RECONCILABLE_STATUSES = [
  'created',
  'queued',
  'processing',
  'completed',
  'failed',
] as const;

export interface ReconcilePayoutsInput {
  /** Which internal statuses to reconcile (default: all reconcilable). */
  statuses?: string[];
  /** Max number of payouts to reconcile in one run. */
  limit?: number;
}

export interface ReconcilePayoutsMismatch {
  payoutId: number;
  internalStatus: string;
  providerStatus: string;
  providerReference: string;
}

export interface ReconcilePayoutsError {
  payoutId: number;
  error: string;
}

export interface ReconcilePayoutsOutput {
  checked: number;
  updated: number;
  mismatches: ReconcilePayoutsMismatch[];
  errors: ReconcilePayoutsError[];
}

@Injectable()
export class ReconcilePayoutsUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly providerService: PayoutProviderService,
  ) {}

  async execute(input: ReconcilePayoutsInput = {}): Promise<ReconcilePayoutsOutput> {
    const statuses = input.statuses ?? RECONCILABLE_STATUSES;
    const limit = input.limit ?? 100;

    // Fetch payouts with a provider reference, in reconcilable statuses.
    const rows = await this.db
      .select({
        id: payouts.id,
        payout_provider_account_id: payouts.payout_provider_account_id,
        status: payouts.status,
        provider_payout_reference: payouts.provider_payout_reference,
      })
      .from(payouts)
      .where(
        and(
          isNotNull(payouts.provider_payout_reference),
          inArray(payouts.status, statuses as any),
        ),
      )
      .orderBy(payouts.updated_at)
      .limit(limit);

    if (rows.length === 0) {
      return { checked: 0, updated: 0, mismatches: [], errors: [] };
    }

    // Group by provider account so we resolve the provider once per account.
    const byProviderAccount = new Map<number, typeof rows>();
    for (const row of rows) {
      const group = byProviderAccount.get(row.payout_provider_account_id) ?? [];
      group.push(row);
      byProviderAccount.set(row.payout_provider_account_id, group);
    }

    const mismatches: ReconcilePayoutsMismatch[] = [];
    const errors: ReconcilePayoutsError[] = [];
    let updated = 0;

    for (const [providerAccountId, group] of byProviderAccount) {
      // Resolve provider for this account.
      const [providerAccount] = await this.db
        .select({ code: paymentProviders.code })
        .from(payoutProviderAccounts)
        .innerJoin(
          paymentProviders,
          eq(payoutProviderAccounts.provider_id, paymentProviders.id),
        )
        .where(eq(payoutProviderAccounts.id, providerAccountId))
        .limit(1);

      if (!providerAccount) {
        for (const row of group) {
          errors.push({
            payoutId: row.id,
            error: `No provider account configured for account ${providerAccountId}`,
          });
        }
        continue;
      }

      const provider = this.providerService.resolve(providerAccount.code);

      // If provider doesn't support getPayoutStatus, skip this group.
      if (!provider.getPayoutStatus) {
        for (const row of group) {
          errors.push({
            payoutId: row.id,
            error: `Provider ${provider.provider} does not support getPayoutStatus`,
          });
        }
        continue;
      }

      for (const row of group) {
        if (!row.provider_payout_reference) continue;

        let providerStatus: string;
        try {
          const result = await provider.getPayoutStatus(row.provider_payout_reference);
          providerStatus = result.status;
        } catch (error: unknown) {
          errors.push({
            payoutId: row.id,
            error:
              error instanceof Error ? error.message : String(error),
          });
          continue;
        }

        const internalStatus = row.status;
        if (providerStatus !== internalStatus) {
          mismatches.push({
            payoutId: row.id,
            internalStatus,
            providerStatus,
            providerReference: row.provider_payout_reference,
          });

          // Update internal status to match provider.
          const updateData: Record<string, unknown> = {
            status: providerStatus,
            updated_at: new Date(),
          };
          if (providerStatus === 'completed') {
            updateData['completed_at'] = new Date();
          } else if (providerStatus === 'failed') {
            updateData['failed_at'] = new Date();
          }

          await this.db
            .update(payouts)
            .set(updateData)
            .where(eq(payouts.id, row.id));
          updated++;
        }
      }
    }

    return {
      checked: rows.length,
      updated,
      mismatches,
      errors,
    };
  }
}
