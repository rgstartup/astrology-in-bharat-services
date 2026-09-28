import {
  Controller,
  Get,
  UseGuards,
  Patch,
  Body,
  Post,
  Query,
  Ip,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { RolesGuard } from '@/internal/auth/guards/role.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { IUser } from '@/shared/types/access-token.payload';
import { PaginationDto } from '@/shared/dto/pagination.dto';
import { AgentService } from '../agent.service';
import { WalletService } from '@/internal/finance/wallet/wallet.service';

// New DTO imports
import { GetAgentStatsDto } from '../dto/get-agent-stats.dto';
import { GetAgentListingsDto } from '../dto/get-agent-listings.dto';
import { RequestAgentWithdrawalDto } from '../dto/request-agent-withdrawal.dto';

@Controller({
  path: 'agent',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('AGENT')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly walletService: WalletService,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: IUser) {
    return this.agentService.getProfile(user);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.agentService.updateProfile(user, body);
    if (result && result.success && 'data' in result) {
      const { data: _data, ...rest } = result as Record<string, unknown>;
      return rest;
    }
    return result;
  }

  @Get('dashboard/stats')
  async getStats(@CurrentUser() user: IUser, @Query() query: GetAgentStatsDto) {
    return this.agentService.getStats(user, query);
  }

  @Post('listings')
  async createListing(
    @CurrentUser() user: IUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.agentService.createListing(user.id, body);
  }

  @Get('listings')
  async getListings(
    @CurrentUser() user: IUser,
    @Query() query: GetAgentListingsDto,
  ) {
    return this.agentService.getListings(user, query);
  }

  @Get('commissions')
  async getCommissions(
    @CurrentUser() user: IUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.agentService.getCommissions(user.id, pagination);
  }

  @Get('wallet/balance')
  async getBalance(@CurrentUser() user: IUser) {
    const profile = await this.agentService.getProfile(user);
    if (!profile) throw new BadRequestException('Agent profile not found');
    const balance = await this.walletService.getBalance(profile.id, 'agent_id');
    return { balance };
  }

  @Get('wallet/withdrawals')
  async getWithdrawals(@CurrentUser() user: IUser) {
    const profile = await this.agentService.getProfile(user);
    if (!profile) throw new BadRequestException('Agent profile not found');
    const result = await this.walletService.getWithdrawals(
      profile.id,
      'agent_id',
    );
    return result.data;
  }

  @Post('wallet/withdraw')
  async requestWithdrawal(
    @CurrentUser() user: IUser,
    @Body() body: RequestAgentWithdrawalDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (body.amount < 500) {
      throw new BadRequestException('Minimum withdrawal amount is ₹500');
    }
    return this.agentService.requestWithdrawal(user, body, idempotencyKey, {
      ip,
      ua,
    });
  }

  @Post('wallet/settle')
  async settleCommissions(@CurrentUser() user: IUser) {
    return this.agentService.settleCommissions(user.id);
  }
}
