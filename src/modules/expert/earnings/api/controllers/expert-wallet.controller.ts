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
import { ExpertEarningsFacade } from '../../application/expert-earnings.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { GetExpertTransactionsDto } from '../dto/get-expert-transactions.dto';
import { RequestExpertWithdrawalDto } from '../dto/request-expert-withdrawal.dto';

@Controller({
  path: 'expert/wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERT')
export class ExpertWalletController {
  constructor(private readonly earningsFacade: ExpertEarningsFacade) {}

  @Get('balance')
  async getBalance(@CurrentProfile() expertProfileId: string) {
    return this.earningsFacade.getWalletBalance(expertProfileId);
  }

  @Get('transactions')
  getTransactions(
    @CurrentProfile() expertProfileId: string,
    @Query() dto: GetExpertTransactionsDto,
  ) {
    return this.earningsFacade.getTransactions(expertProfileId, dto);
  }

  @Post('withdraw')
  async requestWithdrawal(
    @CurrentProfile() expertProfileId: string,
    @Body() dto: RequestExpertWithdrawalDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.earningsFacade.requestWithdrawal(
      expertProfileId,
      dto,
      idempotencyKey,
      { ip, ua },
    );
  }
}
