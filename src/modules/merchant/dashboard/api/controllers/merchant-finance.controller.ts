import { Controller, Get, UseGuards, HttpCode, HttpStatus, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantFinanceStatsUseCase } from '../../application/use-cases/get-merchant-finance-stats.usecase';
import { GetMerchantTransactionsUseCase } from '../../application/use-cases/get-merchant-transactions.usecase';

@Controller({
  path: 'merchant/finance',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MerchantFinanceController {
  constructor(
    private readonly getStats: GetMerchantFinanceStatsUseCase,
    private readonly getTransactions: GetMerchantTransactionsUseCase,
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
}
