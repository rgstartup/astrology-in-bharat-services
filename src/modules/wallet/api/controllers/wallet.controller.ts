import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { WalletFacade } from '../../application/wallet.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Controller({
  path: 'wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletFacade: WalletFacade) { }

  @Get()
  getWallet(@CurrentUser() user: User) {
    return this.walletFacade.getWallet(user.id);
  }

  @Get('balance')
  getBalance(@CurrentUser() user: User) {
    return this.walletFacade.getBalance(user.id);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type: string = 'all',
    @Query('purpose') purpose?: string,
  ) {
    const limitNum = parseInt(limit || '10', 10);
    const offsetNum = parseInt(offset || '0', 10);
    return this.walletFacade.getTransactions(
      user.id,
      limitNum,
      offsetNum,
      type,
      purpose,
    );
  }
}
