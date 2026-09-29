import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MerchantAccountService } from '../../domains/merchant/account/account.service';
import { MerchantStatus } from '../../domains/merchant/account/entities/account.entity';

@Injectable()
export class UpdateMerchantStatusAdminUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantAccountService))
    private readonly merchantService: DeferredDependency<MerchantAccountService>,
  ) {}

  async execute(id: number, data: { status: string; remarks?: string }) {
    const isVerified =
      data.status === 'active' || data.status === MerchantStatus.ACTIVE;
    return this.merchantService.updateVerification(
      id,
      data.status as MerchantStatus,
      isVerified,
    );
  }
}
