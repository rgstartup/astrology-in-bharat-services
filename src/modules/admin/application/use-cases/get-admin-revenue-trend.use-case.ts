import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class GetAdminRevenueTrendUseCase {
  constructor(
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  async execute(days: number = 7) {
    return this.walletFacade.getAdminRevenueTrend(days);
  }
}
