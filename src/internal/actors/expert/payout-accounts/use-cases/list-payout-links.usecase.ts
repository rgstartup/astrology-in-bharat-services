/**
 * List the payout accounts linked to an expert.
 *
 * Joins expert_payout_account_links -> payments.payout_accounts so the
 * frontend can render each linked account (id, display name, status, etc.)
 * without exposing sensitive bank details.
 */
import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { eq } from "drizzle-orm";
import {
  expertPayoutAccountLinks,
  payoutAccounts,
} from "@/core/drizzledb/schema";

export interface ListPayoutLinksInput {
  expertId: number;
}

export interface PayoutLinkItem {
  id: number;
  displayName: string | null;
  accountType: string;
  status: string;
  verificationStatus: string;
  accountFingerprint: string | null;
  isPrimary: boolean;
  createdAt: Date;
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
        displayName: payoutAccounts.display_name,
        accountType: payoutAccounts.account_type,
        status: payoutAccounts.status,
        verificationStatus: payoutAccounts.verification_status,
        accountFingerprint: payoutAccounts.account_fingerprint,
        isPrimary: expertPayoutAccountLinks.is_primary,
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
      .where(eq(expertPayoutAccountLinks.expert_id, input.expertId))
      .orderBy(payoutAccounts.created_at);

    return {
      links: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        accountType: row.accountType,
        status: row.status,
        verificationStatus: row.verificationStatus,
        accountFingerprint: row.accountFingerprint,
        isPrimary: row.isPrimary,
        createdAt: row.createdAt,
      })),
    };
  }
}
