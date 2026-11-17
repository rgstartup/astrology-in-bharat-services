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
  payoutProviderAccounts,
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
  /** Last 4 digits of bank account number — safe to display for expert UX. */
  accountNumberMasked: string | null;
  /** Bank name (nullable — may not be available from all providers). */
  bankName: string | null;
  /** IFSC code (nullable for VPA/wallet types). */
  ifsc: string | null;
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
        providerProduct: payoutProviderAccounts.name,
        onboardingStatus: payoutAccounts.status,
        accountStatus: payoutAccounts.verification_status,
        externalAccountId: payoutAccountReferences.provider_reference,
        accountNumberMasked: payoutAccounts.account_number_masked,
        bankName: payoutAccounts.bank_name,
        ifsc: payoutAccounts.ifsc,
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
        payoutProviderAccounts,
        eq(
          payoutAccounts.payout_provider_account_id,
          payoutProviderAccounts.id,
        ),
      )
      .innerJoin(
        paymentProviders,
        eq(
          payoutProviderAccounts.provider_id,
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
        accountNumberMasked: row.accountNumberMasked,
        bankName: row.bankName,
        ifsc: row.ifsc,
      })),
    };
  }
}
