import { Controller, Get, Post, Body, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { WalletFacade } from '../../application/wallet.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Controller({
  path: 'wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletFacade: WalletFacade,
    private readonly userRepository: UserRepository,
  ) {}

  private async resolveUserId(betterAuthId: string): Promise<number> {
    const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
    if (!localUser) throw new NotFoundException('User not found');
    return localUser.id;
  }

  @Get()
  async getWallet(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.walletFacade.getWallet(userId);
  }

  @Get('balance')
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.walletFacade.getBalance(userId);
  }

  @Post('topup')
  async topUp(@CurrentUser() user: AuthenticatedUser, @Body('amount') amount: number) {
    const userId = await this.resolveUserId(user.id);
    return this.walletFacade.topUp(userId, amount);
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type: string = 'all',
    @Query('purpose') purpose?: string,
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.walletFacade.getTransactions(userId, page, limit, type, purpose);
  }
}
