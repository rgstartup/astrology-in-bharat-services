import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { merchantAccounts } from '@/core/drizzledb/schema';
import type { IMerchant } from '@/shared/types/access-token.payload';
import { UpdateMerchantAccountDto } from '../dto/request/account.dto';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';
import { toMerchantAccountResponse } from '../account.mapper';
import { ResourceNotFoundError } from '@/shared/errors';

@Injectable()
export class UpdateMerchantAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    merchant: IMerchant,
    dto: UpdateMerchantAccountDto,
  ): Promise<MerchantAccountResponseDto> {
    const updateData: Record<string, unknown> = {
      ...dto,
      updated_at: new Date(),
    };

    if (dto.latitude !== undefined) {
      updateData.latitude = dto.latitude != null ? String(dto.latitude) : null;
    }
    if (dto.longitude !== undefined) {
      updateData.longitude =
        dto.longitude != null ? String(dto.longitude) : null;
    }

    const [updated] = await this.db
      .update(merchantAccounts)
      .set(updateData)
      .where(eq(merchantAccounts.id, merchant.sub))
      .returning();

    if (!updated) {
      throw new ResourceNotFoundError('Merchant', merchant.sub);
    }

    return MerchantAccountResponseDto.from(toMerchantAccountResponse(updated));
  }
}
