import { Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode, HttpStatus, Query, DefaultValuePipe, ParseUUIDPipe, Headers, Ip, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantFinanceStatsUseCase } from '../../application/use-cases/get-merchant-finance-stats.usecase';
import { GetMerchantTransactionsUseCase } from '../../application/use-cases/get-merchant-transactions.usecase';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller({
  path: 'merchant/finance',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'AGENT', 'EXPERT')
export class MerchantFinanceController {
  constructor(
    private readonly getStats: GetMerchantFinanceStatsUseCase,
    private readonly getTransactions: GetMerchantTransactionsUseCase,
    private readonly walletFacade: WalletFacade,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(@CurrentUser('id') userId: string) {
    const stats = await this.getStats.execute(userId);
    return { success: true, data: stats };
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  async transactions(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const transactions = await this.getTransactions.execute(userId, { search, page, limit });
    return { success: true, data: transactions };
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser('id') userId: string,
    @Body('amount') amount: number,
    @Body('bankAccountId') bankAccountId: string | number,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    const withdrawal = await this.walletFacade.requestWithdrawal(userId as any, amount, bankAccountId, idempotencyKey, { ip, ua });
    return {
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawal,
    };
  }
}

