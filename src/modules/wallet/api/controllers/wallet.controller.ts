import { Controller, Get, Body, UseGuards, Query } from '@nestjs/common';
import { WalletFacade } from '../../application/wallet.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletFacade: WalletFacade) {}

  @Get()
  getWallet(@CurrentProfile() clientProfileId: string) {
    return this.walletFacade.getWallet(clientProfileId, 'client_id');
  }

  @Get('balance')
  getBalance(@CurrentProfile() clientProfileId: string) {
    return this.walletFacade.getBalance(clientProfileId, 'client_id');
  }

  @Get('transactions')
  getTransactions(
    @CurrentProfile() clientProfileId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type: string = 'all',
    @Query('purpose') purpose?: string,
  ) {
    const limitNum = limit || '10';
    const offsetNum = offset || '0';
    return this.walletFacade.getTransactions(
      clientProfileId,
      'client_id',
      limitNum,
      offsetNum,
      type,
      purpose,
    );
  }
}
