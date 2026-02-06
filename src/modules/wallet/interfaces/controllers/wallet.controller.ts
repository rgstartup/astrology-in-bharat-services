import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { User } from '@/modules/users/domain/entities/user.entity';
import { WalletService } from '@/modules/wallet/application/services/wallet.service';

@Controller({
  path: 'wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get()
  getWallet(@CurrentUser() user: User) {
    return this.walletService.getWallet(user.id);
  }

  @Get('balance')
  getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Post('topup')
  topUp(@CurrentUser() user: User, @Body('amount') amount: number) {
    return this.walletService.topUp(user.id, amount);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type: string = 'all',
    @Query('purpose') purpose?: string,
  ) {
    return this.walletService.getTransactions(
      user.id,
      page,
      limit,
      type,
      purpose,
    );
  }
}

