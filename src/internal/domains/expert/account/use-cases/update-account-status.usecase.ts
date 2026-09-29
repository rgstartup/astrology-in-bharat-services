import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts } from '@/core/drizzledb/schema';
import { IExpert } from '@/shared/types/access-token.payload';
import { ExpertKycStatus } from '../../shared/enums/kyc-status.enum';
import { toExpertAccountResponse } from '../account.mapper';

@Injectable()
export class UpdateExpertAccountStatusUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert: IExpert, isAvailable: boolean) {
    const [account] = await this.db
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.id, Number(expert.sub)))
      .limit(1);
    if (!account) throw new NotFoundException('Expert account not found');
    if (isAvailable && account.kyc_status !== ExpertKycStatus.APPROVED) {
      throw new ForbiddenException(
        'Your account is inactive. You cannot go online.',
      );
    }
    const [updated] = await this.db
      .update(expertAccounts)
      .set({ is_available: isAvailable, updated_at: new Date() })
      .where(eq(expertAccounts.id, account.id))
      .returning();
    return toExpertAccountResponse(updated);
  }

  async updateKyc(id: number, status: ExpertKycStatus, reason?: string) {
    const [account] = await this.db
      .select({ id: expertAccounts.id })
      .from(expertAccounts)
      .where(eq(expertAccounts.id, Number(id)))
      .limit(1);
    if (!account) throw new NotFoundException('Expert account not found');
    const [updated] = await this.db
      .update(expertAccounts)
      .set({
        kyc_status: status,
        rejection_reason: reason ?? null,
        updated_at: new Date(),
      })
      .where(eq(expertAccounts.id, Number(id)))
      .returning();
    return toExpertAccountResponse(updated);
  }
}
