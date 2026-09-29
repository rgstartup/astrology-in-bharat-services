import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { WalletService } from '../wallet.service';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { CurrentProfile } from '@/shared/decorators/current-profile.decorator';

import { GetTransactionsDto } from '../dto/get-transactions.dto';

@Controller({
  path: 'wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@CurrentProfile() clientProfileId: string) {
    return this.walletService.getWallet(clientProfileId, 'client_id');
  }

  @Get('balance')
  getBalance(@CurrentProfile() clientProfileId: string) {
    return this.walletService.getBalance(clientProfileId, 'client_id');
  }

  @Get('transactions')
  getTransactions(
    @CurrentProfile() clientProfileId: string,
    @Query() dto: GetTransactionsDto,
  ) {
    return this.walletService.getTransactions(
      clientProfileId,
      'client_id',
      dto,
    );
  }
}
