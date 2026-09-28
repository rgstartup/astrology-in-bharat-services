import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ClientWalletService } from '../wallet.service';
import { ClientJwtAuthGuard } from '@/internal/domains/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/domains/client/auth/decorators/current-client.decorator';
import { GetClientTransactionsDto } from '../dto/get-client-transactions.dto';
import { InitiateRechargeDto } from '../dto/initiate-recharge.dto';
import { VerifyRechargeDto } from '../dto/verify-recharge.dto';
import { ClientAccount } from '@/internal/domains/client/account/entities/account.entity';

@Controller({
  path: 'client/wallet',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientWalletController {
  constructor(private readonly clientWalletService: ClientWalletService) {}

  @Get()
  getWallet(@CurrentClient('id') clientId: number) {
    return this.clientWalletService.getWallet(clientId);
  }

  @Get('balance')
  getBalance(@CurrentClient('id') clientId: number) {
    return this.clientWalletService.getBalance(clientId);
  }

  @Get('transactions')
  getTransactions(
    @CurrentClient('id') clientId: number,
    @Query() dto: GetClientTransactionsDto,
  ) {
    return this.clientWalletService.getTransactions(clientId, dto);
  }

  @Post('recharge/initiate')
  initiateRecharge(
    @CurrentClient() client: ClientAccount,
    @Body() dto: InitiateRechargeDto,
  ) {
    return this.clientWalletService.initiateRecharge(client, dto);
  }

  @Post('recharge/verify')
  verifyRecharge(
    @CurrentClient('id') clientId: number,
    @Body() dto: VerifyRechargeDto,
  ) {
    return this.clientWalletService.verifyRecharge(clientId, dto);
  }
}
