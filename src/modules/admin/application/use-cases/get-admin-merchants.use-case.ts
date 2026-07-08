import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';
import { GetAdminMerchantsDto } from '../../api/dto/get-merchants.dto';

@Injectable()
export class GetAdminMerchantsUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantProfileFacade))
    private readonly merchantFacade: MerchantProfileFacade,
  ) {}

  async execute(dto: GetAdminMerchantsDto) {
    const { search, status, page, limit } = dto;
    return this.merchantFacade.getAdminMerchants({
      search,
      status,
      page,
      limit,
    });
  }
}

