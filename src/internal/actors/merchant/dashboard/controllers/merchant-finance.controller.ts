import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Headers,
  Ip,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../../auth/guards/auth.guard';
import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import { GetMerchantFinanceStatsUseCase } from '../use-cases/get-merchant-finance-stats.usecase';
import { WalletService } from '../../../../finance/wallet/wallet.service';
import { MerchantAccount } from '../../account/entities/account.entity';
import { GetMerchantFinanceTransactionsDto } from '../dto/get-merchant-finance-transactions.dto';
import { RequestMerchantWithdrawalDto } from '../dto/request-merchant-withdrawal.dto';

import { RolesGuard } from '../../../../auth/guards/role.guard';
import { Roles } from '../../../../../shared/decorators/roles.decorator';

@Controller({
  path: 'merchant/finance',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'AGENT', 'EXPERT')
export class MerchantFinanceController {
  constructor(
    private readonly getStats: GetMerchantFinanceStatsUseCase,
    private readonly walletService: WalletService,
    @InjectRepository(MerchantAccount)
    private readonly merchantRepo: Repository<MerchantAccount>,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(@CurrentUser('id') userId: number) {
    const stats = await this.getStats.execute(userId);
    return { success: true, data: stats };
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  async transactions(
    @CurrentUser('id') userId: number,
    @Query() dto: GetMerchantFinanceTransactionsDto,
  ) {
    const profile = await this.merchantRepo.findOne({
      where: { user_id: userId },
    });
    if (!profile) throw new BadRequestException('Merchant profile not found');

    const transactions = await this.walletService.getMerchantTransactions(
      profile.id,
      dto,
    );
    return { success: true, data: transactions };
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser('id') userId: number,
    @Body() dto: RequestMerchantWithdrawalDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    const profile = await this.merchantRepo.findOne({
      where: { user_id: userId },
    });
    if (!profile) throw new BadRequestException('Merchant profile not found');

    const withdrawal = await this.walletService.requestWithdrawal(
      profile.id,
      'merchant_id',
      dto.amount,
      dto.bankAccountId,
      idempotencyKey,
      { ip, ua },
    );
    return {
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawal,
    };
  }
}
