import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { eq, and } from 'drizzle-orm';
import {
  expertPayoutAccountLinks,
  payoutAccounts,
} from '@/core/drizzledb/schema';
import {
  PayoutAccountIsPrimaryError,
  PayoutAccountNotLinkedError,
  PayoutAccountNotFoundError,
} from '../errors';

export interface RemovePayoutAccountInput {
  expertId: number;
  payoutAccountId: number;
}

export interface RemovePayoutAccountOutput {
  removed: boolean;
}

@Injectable()
export class RemovePayoutAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    input: RemovePayoutAccountInput,
  ): Promise<RemovePayoutAccountOutput> {
    // Verify the link exists and belongs to this expert.
    const [link] = await this.db
      .select({
        id: expertPayoutAccountLinks.id,
        payout_account_id: expertPayoutAccountLinks.payout_account_id,
        is_primary: expertPayoutAccountLinks.is_primary,
      })
      .from(expertPayoutAccountLinks)
      .where(
        and(
          eq(expertPayoutAccountLinks.expert_id, input.expertId),
          eq(expertPayoutAccountLinks.payout_account_id, input.payoutAccountId),
        ),
      )
      .limit(1);

    if (!link) {
      throw new PayoutAccountNotLinkedError(
        input.payoutAccountId,
        input.expertId,
      );
    }

    if (link.is_primary) {
      throw new PayoutAccountIsPrimaryError(input.payoutAccountId);
    }

    // Remove the expert→payout account link.
    await this.db
      .delete(expertPayoutAccountLinks)
      .where(
        and(
          eq(expertPayoutAccountLinks.expert_id, input.expertId),
          eq(expertPayoutAccountLinks.payout_account_id, input.payoutAccountId),
        ),
      );

    // If the payout account is no longer linked to any expert, delete it too.
    const remainingLinks = await this.db
      .select({ id: expertPayoutAccountLinks.id })
      .from(expertPayoutAccountLinks)
      .where(
        eq(expertPayoutAccountLinks.payout_account_id, input.payoutAccountId),
      );

    if (remainingLinks.length === 0) {
      await this.db
        .delete(payoutAccounts)
        .where(eq(payoutAccounts.id, input.payoutAccountId));
    }

    return { removed: true };
  }
}
