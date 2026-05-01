import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { ExpertEarningsFacade } from '../../application/expert-earnings.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@Controller({
    path: 'expert/wallet',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class ExpertWalletController {
    constructor(private readonly earningsFacade: ExpertEarningsFacade) { }

    @Get('balance')
    async getBalance(@CurrentUser() user: AuthenticatedUser) {
        return this.earningsFacade.getWalletBalance(user.id);
    }

    @Get('transactions')
    getTransactions(
        @CurrentUser() user: AuthenticatedUser,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
        @Query('type') type: string = 'all',
    ) {
        return this.earningsFacade.getTransactions(user.id, page, limit, type);
    }

    @Post('withdraw')
    async requestWithdrawal(
        @CurrentUser() user: any,
        @Body('amount') amount: number,
        @Body('bank_account_id') bank_account_id: number,
    ) {
        return this.earningsFacade.requestWithdrawal(user.id, amount, bank_account_id);
    }
}
