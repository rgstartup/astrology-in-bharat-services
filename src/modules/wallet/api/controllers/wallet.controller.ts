import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { WalletFacade } from '../../application/wallet.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

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

  @Post('topup')
  topUp(@CurrentUser() user: User, @Body('amount') amount: number) {
    return this.walletFacade.topUp(user.id, amount);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type: string = 'all',
    @Query('purpose') purpose?: string,
  ) {
    return this.walletFacade.getTransactions(
      user.id,
      page,
      limit,
      type,
      purpose,
    );
  }
}
