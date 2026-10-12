import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { merchantAccounts, MerchantStatus } from '@/core/drizzledb/schema';
import type { IMerchant } from '@/shared/types/access-token.payload';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';
import { toMerchantAccountResponse } from '../account.mapper';
import { ResourceNotFoundError } from '@/shared/errors';

@Injectable()
export class UpdateMerchantStatusUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    merchant: IMerchant,
    isOnline?: boolean,
  ): Promise<MerchantAccountResponseDto> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (isOnline !== undefined) {
      updateData.is_online = isOnline;
    }

    const [saved] = await this.db
      .update(merchantAccounts)
      .set(updateData)
      .where(eq(merchantAccounts.id, merchant.sub))
      .returning();

    if (!saved) {
      throw new ResourceNotFoundError('Merchant', merchant.sub);
    }

    return MerchantAccountResponseDto.from(toMerchantAccountResponse(saved));
  }

  async updateVerification(
    id: number,
    status: MerchantStatus,
    isVerified?: boolean,
  ): Promise<MerchantAccountResponseDto> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };

    if (isVerified !== undefined) {
      updateData.is_verified = isVerified;
    }

    const [saved] = await this.db
      .update(merchantAccounts)
      .set(updateData)
      .where(eq(merchantAccounts.id, id))
      .returning();

    if (!saved) {
      throw new ResourceNotFoundError('Merchant', id);
    }

    return MerchantAccountResponseDto.from(toMerchantAccountResponse(saved));
  }
}
