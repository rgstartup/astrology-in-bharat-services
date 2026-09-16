import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MerchantAccountFacade } from '@/modules/merchant/account/account.facade';
import { MerchantStatus } from '@/modules/merchant/account/entities/account.entity';

@Injectable()
export class UpdateMerchantStatusAdminUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantAccountFacade))
    private readonly merchantFacade: MerchantAccountFacade,
  ) {}

  async execute(id: number, data: { status: string; remarks?: string }) {
    const isVerified = data.status === 'active' || data.status === MerchantStatus.ACTIVE;
    return this.merchantFacade.updateVerification(
      id,
      data.status as MerchantStatus,
      isVerified,
    );
  }
}

