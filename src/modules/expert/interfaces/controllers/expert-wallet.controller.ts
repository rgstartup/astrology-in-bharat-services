import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { User } from '@/modules/users/domain/entities/user.entity';
import { WalletService } from '@/modules/wallet/application/services/wallet.service';

@Controller({
    path: 'expert/wallet',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class ExpertWalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get('balance')
    async getBalance(@CurrentUser() user: User) {
        const balance = await this.walletService.getBalance(user.id);
        const stats = await this.walletService.getWithdrawalsStatus(user.id);

        return {
            availableBalance: balance,
            ...stats
        };
    }

    @Get('transactions')
    getTransactions(
        @CurrentUser() user: User,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
        @Query('type') type: string = 'all',
    ) {
        return this.walletService.getTransactions(user.id, page, limit, type);
    }

    @Post('withdraw')
    async withdraw(
        @CurrentUser() user: User,
        @Body('amount') amount: number,
        @Body('bankAccountId') bankAccountId: number,
    ) {
        return this.walletService.requestWithdrawal(user.id, amount, bankAccountId);
    }
}

