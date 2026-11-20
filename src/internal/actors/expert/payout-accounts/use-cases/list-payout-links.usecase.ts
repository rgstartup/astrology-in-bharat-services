/**
 * List the payout accounts linked to an expert.
 *
 * Joins expert_payout_account_links -> payments.payout_accounts ->
 * payments.payout_provider_accounts -> payments.payment_providers, with a
 * left join to payments.payout_account_references for the external account
 * id. Returns one row per linked account shaped to the frontend
 * PayoutAccountLink contract.
 */
import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  expertPayoutAccountLinks,
  payoutAccounts,
  payoutProviderConfigs,
  paymentProviders,
  payoutAccountReferences,
  payoutAccountReferenceTypeEnum,
} from "@/core/drizzledb/schema";

export interface ListPayoutLinksInput {
  expertId: number;
}

export interface PayoutLinkItem {
  id: number;
  paymentProvider: string;
  providerProduct: string;
  onboardingStatus: string;
  accountStatus: string | null;
  externalAccountId: string | null;
  isActive: boolean;
  isPrimary: boolean;
  activatedAt: string | null;
  createdAt: string;
  /** Type-specific structured details (bank_account: account_number_masked/bank_name/ifsc; vpa: vpa_id; wallet: wallet_handle; card: last4/brand). */
  details: Record<string, unknown> | null;
}

export interface ListPayoutLinksOutput {
  links: PayoutLinkItem[];
}

@Injectable()
export class ListPayoutLinksUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    input: ListPayoutLinksInput,
  ): Promise<ListPayoutLinksOutput> {
    const rows = await this.db
      .select({
        id: payoutAccounts.id,
        paymentProvider: paymentProviders.code,
        providerProduct: payoutProviderConfigs.name,
        onboardingStatus: payoutAccounts.status,
        accountStatus: payoutAccounts.verification_status,
        externalAccountId: payoutAccountReferences.provider_reference,
        details: payoutAccounts.details,
        isPrimary: expertPayoutAccountLinks.is_primary,
        activatedAt: payoutAccounts.verified_at,
        createdAt: payoutAccounts.created_at,
      })
      .from(expertPayoutAccountLinks)
      .innerJoin(
        payoutAccounts,
        eq(
          expertPayoutAccountLinks.payout_account_id,
          payoutAccounts.id,
        ),
      )
      .innerJoin(
        payoutProviderConfigs,
        eq(
          payoutAccounts.payout_provider_account_id,
          payoutProviderConfigs.id,
        ),
      )
      .innerJoin(
        paymentProviders,
        eq(
          payoutProviderConfigs.provider_id,
          paymentProviders.id,
        ),
      )
      .leftJoin(
        payoutAccountReferences,
        and(
          eq(
            payoutAccountReferences.payout_account_id,
            payoutAccounts.id,
          ),
          eq(
            payoutAccountReferences.reference_type,
            "external_account",
          ),
          isNotNull(payoutAccountReferences.provider_reference),
        ),
      )
      .where(eq(expertPayoutAccountLinks.expert_id, input.expertId))
      .orderBy(payoutAccounts.created_at);

    return {
      links: rows.map((row) => ({
        id: row.id,
        paymentProvider: row.paymentProvider,
        providerProduct: row.providerProduct,
        onboardingStatus: row.onboardingStatus,
        accountStatus: row.accountStatus,
        externalAccountId: row.externalAccountId,
        isActive: row.onboardingStatus === "active",
        isPrimary: row.isPrimary,
        activatedAt: row.activatedAt
          ? new Date(row.activatedAt).toISOString()
          : null,
        createdAt: new Date(row.createdAt).toISOString(),
        details: row.details,
      })),
    };
  }
}
