import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    ParseIntPipe,
    Headers,
    Ip,
} from '@nestjs/common';
import { ExpertEarningsFacade } from '../../application/expert-earnings.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Controller({
    path: 'expert/wallet',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class ExpertWalletController {
    constructor(private readonly earningsFacade: ExpertEarningsFacade) { }

    @Get('balance')
    async getBalance(@CurrentUser() user: User) {
        return this.earningsFacade.getWalletBalance(user.id);
    }

    @Get('transactions')
    getTransactions(
        @CurrentUser() user: User,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
        @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
        @Query('type') type: string = 'all',
    ) {
        return this.earningsFacade.getTransactions(user.id, limit, offset, type);
    }

    @Post('withdraw')
    async requestWithdrawal(
        @CurrentUser() user: any,
        @Body('amount') amount: number,
        @Body('bank_account_id') bank_account_id: string | number,
        @Ip() ip: string,
        @Headers('user-agent') ua: string,
        @Headers('x-idempotency-key') idempotencyKey: string,
    ) {
        return this.earningsFacade.requestWithdrawal(user.id, amount, bank_account_id, idempotencyKey, { ip, ua });
    }
}
