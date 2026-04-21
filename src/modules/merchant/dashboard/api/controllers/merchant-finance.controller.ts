import { Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode, HttpStatus, Query, DefaultValuePipe, ParseIntPipe, Headers, Ip } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantFinanceStatsUseCase } from '../../application/use-cases/get-merchant-finance-stats.usecase';
import { GetMerchantTransactionsUseCase } from '../../application/use-cases/get-merchant-transactions.usecase';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Controller({
  path: 'merchant/finance',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MerchantFinanceController {
  constructor(
    private readonly getStats: GetMerchantFinanceStatsUseCase,
    private readonly getTransactions: GetMerchantTransactionsUseCase,
    private readonly walletFacade: WalletFacade,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(@CurrentUser('id') userId: number) {
    return this.getStats.execute(userId);
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  async transactions(
    @CurrentUser('id') userId: number,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.getTransactions.execute(userId, { search, page, limit });
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser('id') userId: number,
    @Body('amount') amount: number,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    const withdrawal = await this.walletFacade.requestWithdrawal(userId, amount, undefined, idempotencyKey, { ip, ua });
    return {
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawal,
    };
  }
}
