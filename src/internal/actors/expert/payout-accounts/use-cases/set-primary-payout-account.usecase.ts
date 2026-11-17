import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { eq, and } from 'drizzle-orm';
import { expertPayoutAccountLinks } from '@/core/drizzledb/schema';
import { PayoutAccountNotLinkedError } from '../errors';

export interface SetPrimaryPayoutAccountInput {
  expertId: number;
  payoutAccountId: number;
}

export interface SetPrimaryPayoutAccountOutput {
  set: boolean;
}

@Injectable()
export class SetPrimaryPayoutAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    input: SetPrimaryPayoutAccountInput,
  ): Promise<SetPrimaryPayoutAccountOutput> {
    // Verify the link exists and belongs to this expert.
    const [link] = await this.db
      .select({
        id: expertPayoutAccountLinks.id,
        payout_account_id: expertPayoutAccountLinks.payout_account_id,
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

    // Unset all primary flags for this expert, then set this one.
    await this.db
      .update(expertPayoutAccountLinks)
      .set({ is_primary: false })
      .where(eq(expertPayoutAccountLinks.expert_id, input.expertId));

    await this.db
      .update(expertPayoutAccountLinks)
      .set({ is_primary: true })
      .where(
        and(
          eq(expertPayoutAccountLinks.expert_id, input.expertId),
          eq(expertPayoutAccountLinks.payout_account_id, input.payoutAccountId),
        ),
      );

    return { set: true };
  }
}
