import { Controller, Get, Body, UseGuards, Query } from '@nestjs/common';
import { WalletFacade } from '../../application/wallet.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';

@Controller({
  path: 'wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletFacade: WalletFacade) {}

  @Get()
  getWallet(@CurrentUser() user: IUser) {
    return this.walletFacade.getWallet(user.id);
  }

  @Get('balance')
  getBalance(@CurrentUser() user: IUser) {
    return this.walletFacade.getBalance(user.id);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: IUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type: string = 'all',
    @Query('purpose') purpose?: string,
  ) {
    const limitNum = limit || '10';
    const offsetNum = offset || '0';
    return this.walletFacade.getTransactions(
      user.id,
      limitNum,
      offsetNum,
      type,
      purpose,
    );
  }
}
