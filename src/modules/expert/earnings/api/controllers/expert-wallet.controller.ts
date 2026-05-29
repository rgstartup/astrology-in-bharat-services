import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Headers,
    Ip,
} from '@nestjs/common';
import { ExpertEarningsFacade } from '../../application/expert-earnings.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Controller({
    path: 'expert/wallet',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERT')
export class ExpertWalletController {
    constructor(private readonly earningsFacade: ExpertEarningsFacade) { }

    @Get('balance')
    async getBalance(@CurrentUser() user: User) {
        return this.earningsFacade.getWalletBalance(user.id as any);
    }

    @Get('transactions')
    getTransactions(
        @CurrentUser() user: User,
        @Query('limit') limit: string = '10',
        @Query('page') page: string = '1',
        @Query('offset') offset: string,
        @Query('type') type: string = 'all',
    ) {
        const parsedLimit = parseInt(limit, 10) || 10;
        const parsedPage = parseInt(page, 10) || 1;
        const parsedOffset = offset ? parseInt(offset, 10) : (parsedPage - 1) * parsedLimit;

        return this.earningsFacade.getTransactions(user.id as any, parsedLimit, parsedOffset, type);
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
