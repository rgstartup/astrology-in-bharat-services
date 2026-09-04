import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  Ip,
} from '@nestjs/common';
import { ExpertEarningsFacade } from '../expert-earnings.facade';
import { ExpertJwtAuthGuard } from '@/modules/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';
import { GetExpertTransactionsDto } from '../dto/get-expert-transactions.dto';
import { RequestExpertWithdrawalDto } from '../dto/request-expert-withdrawal.dto';

@Controller({
  path: 'expert/wallet',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertWalletController {
  constructor(private readonly earningsFacade: ExpertEarningsFacade) {}

  @Get('balance')
  async getBalance(@CurrentExpert() expert: IExpert) {
    return this.earningsFacade.getWalletBalance(expert.sub);
  }

  @Get('transactions')
  getTransactions(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertTransactionsDto,
  ) {
    return this.earningsFacade.getTransactions(expert.sub, dto);
  }

  @Post('withdraw')
  async requestWithdrawal(
    @CurrentExpert() expert: IExpert,
    @Body() dto: RequestExpertWithdrawalDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.earningsFacade.requestWithdrawal(
      expert.sub,
      dto,
      idempotencyKey,
      { ip, ua },
    );
  }
}
