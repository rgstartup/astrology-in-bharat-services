import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';

@Injectable()
export class UpdateMerchantStatusAdminUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantProfileFacade))
    private readonly merchantFacade: MerchantProfileFacade,
  ) {}

  async execute(id: string, data: { status: string; remarks?: string }) {
    return this.merchantFacade.updateAdminMerchantStatus(
      id,
      data.status,
      data.remarks,
    );
  }
}
