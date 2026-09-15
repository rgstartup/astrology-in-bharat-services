import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MerchantAccountFacade } from '@/modules/merchant/account/account.facade';
import { GetAdminMerchantsDto } from '../dto/get-merchants.dto';
import { MerchantStatus } from '@/modules/merchant/account/entities/account.entity';

@Injectable()
export class GetAdminMerchantsUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantAccountFacade))
    private readonly merchantFacade: MerchantAccountFacade,
  ) {}

  async execute(dto: GetAdminMerchantsDto) {
    const { search, status, page = 1, limit = 10 } = dto;
    return this.merchantFacade.listAccounts({
      q: search,
      status: status ? (status as MerchantStatus) : undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      skip: ((Number(page) || 1) - 1) * (Number(limit) || 10),
      offset: ((Number(page) || 1) - 1) * (Number(limit) || 10),
    });
  }
}

