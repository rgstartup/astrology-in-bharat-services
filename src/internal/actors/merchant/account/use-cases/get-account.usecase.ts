import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { merchantAccounts } from '@/core/drizzledb/schema';
import type { IMerchant } from '@/shared/types/access-token.payload';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';
import { toMerchantAccountResponse } from '../account.mapper';
import { ResourceNotFoundError } from '@/shared/errors';

@Injectable()
export class GetMerchantAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(merchant: IMerchant): Promise<MerchantAccountResponseDto> {
    const [account] = await this.db
      .select()
      .from(merchantAccounts)
      .where(eq(merchantAccounts.id, merchant.sub))
      .limit(1);

    if (!account) {
      throw new ResourceNotFoundError('Merchant', merchant.sub);
    }

    return MerchantAccountResponseDto.from(toMerchantAccountResponse(account));
  }
}
