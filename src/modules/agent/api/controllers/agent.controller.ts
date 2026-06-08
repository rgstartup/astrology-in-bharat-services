import { Controller, Get, UseGuards, Patch, Body, Post, Query, ParseFloatPipe, Ip, Headers, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { DateRangeDto } from '@/common/dto/date-range.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AgentFacade } from '../../application/agent.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Controller({
    path: 'agent',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('AGENT')
export class AgentController {
    constructor(
        private readonly agentFacade: AgentFacade,
        private readonly walletFacade: WalletFacade,
    ) {}

    @Get('profile')
    async getProfile(@CurrentUser() user: User) {
        return this.agentFacade.getProfile(user.id);
    }

    @Patch('profile')
    async updateProfile(
        @CurrentUser() user: User,
        @Body() body: any
    ) {
        const result = await this.agentFacade.updateProfile(user.id, body);
        if (result && result.success && 'data' in result) {
            const { data, ...rest } = result as any;
            return rest;
        }
        return result;
    }

    @Get('dashboard/stats')
    async getStats(
        @CurrentUser() user: User,
        @Query('range') range: string = '30d',
        @Query() dateRangeDto: DateRangeDto
    ) {
        return this.agentFacade.getStats(user.id, range, dateRangeDto);
    }

    @Post('listings')
    async createListing(
        @CurrentUser() user: User,
        @Body() body: any,
    ) {
        return this.agentFacade.createListing(user.id, body);
    }

    @Get('listings')
    async getListings(
        @CurrentUser() user: User,
        @Query() pagination: PaginationDto,
        @Query('type') type?: string,
        @Query('search') search?: string,
    ) {
        return this.agentFacade.getListings(user.id, pagination, type, search);
    }

    @Get('commissions')
    async getCommissions(
        @CurrentUser() user: User,
        @Query() pagination: PaginationDto,
    ) {
        return this.agentFacade.getCommissions(user.id, pagination);
    }

    @Get('wallet/balance')
    async getBalance(@CurrentUser() user: User) {
        const balance = await this.walletFacade.getBalance(user.id);
        return { balance };
    }

    @Get('wallet/withdrawals')
    async getWithdrawals(@CurrentUser() user: User) {
        const result = await this.walletFacade.getWithdrawals(user.id);
        return result.data;
    }

    @Post('wallet/withdraw')
    async requestWithdrawal(
        @CurrentUser() user: User,
        @Body('amount', ParseFloatPipe) amount: number,
        @Body('bank_account_id') bankAccountId: string | number,
        @Ip() ip: string,
        @Headers('user-agent') ua: string,
        @Headers('x-idempotency-key') idempotencyKey: string,
    ) {
        if (amount < 500) {
            throw new BadRequestException('Minimum withdrawal amount is ₹500');
        }
        return this.walletFacade.requestWithdrawal(user.id, amount, bankAccountId, idempotencyKey, { ip, ua });
    }

    @Post('wallet/settle')
    async settleCommissions(@CurrentUser() user: User) {
        return this.agentFacade.settleCommissions(user.id);
    }
}
