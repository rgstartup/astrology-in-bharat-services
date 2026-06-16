import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  Headers,
  Ip,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantFinanceStatsUseCase } from '../../application/use-cases/get-merchant-finance-stats.usecase';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

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
    private readonly walletFacade: WalletFacade,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepo: Repository<ProfileMerchant>,
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
    const profile = await this.merchantRepo.findOne({
      where: { user_id: userId },
    });
    if (!profile) throw new BadRequestException('Merchant profile not found');

    const transactions = await this.walletFacade.getMerchantTransactions(
      profile.id,
      { search, page, limit },
    );
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
    const profile = await this.merchantRepo.findOne({
      where: { user_id: userId },
    });
    if (!profile) throw new BadRequestException('Merchant profile not found');

    const withdrawal = await this.walletFacade.requestWithdrawal(
      profile.id,
      'merchant_id',
      amount,
      bankAccountId,
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
