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
import { ExpertEarningsService } from '../expert-earnings.service';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentExpert } from '../../auth/decorators/current-expert.decorator';
import { type IExpert } from '../../../../../shared/types/access-token.payload';
import { GetExpertTransactionsDto } from '../dto/get-expert-transactions.dto';
import { RequestExpertWithdrawalDto } from '../dto/request-expert-withdrawal.dto';

@Controller({
  path: 'expert/wallet',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertWalletController {
  constructor(private readonly earningsService: ExpertEarningsService) {}

  @Get('balance')
  async getBalance(@CurrentExpert() expert: IExpert) {
    return this.earningsService.getWalletBalance(expert.sub);
  }

  @Get('transactions')
  getTransactions(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertTransactionsDto,
  ) {
    return this.earningsService.getTransactions(expert.sub, dto);
  }

  @Post('withdraw')
  async requestWithdrawal(
    @CurrentExpert() expert: IExpert,
    @Body() dto: RequestExpertWithdrawalDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.earningsService.requestWithdrawal(
      expert.sub,
      dto,
      idempotencyKey,
      { ip, ua },
    );
  }
}
