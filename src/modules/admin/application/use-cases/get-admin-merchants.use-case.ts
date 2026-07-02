import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';

@Injectable()
export class GetAdminMerchantsUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantProfileFacade))
    private readonly merchantFacade: MerchantProfileFacade,
  ) {}

  async execute(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.merchantFacade.getAdminMerchants(params);
  }
}
