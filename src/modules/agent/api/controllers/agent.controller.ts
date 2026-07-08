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
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AgentFacade } from '../../application/agent.facade';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

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
    private readonly agentFacade: AgentFacade,
    private readonly walletFacade: WalletFacade,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: IUser) {
    return this.agentFacade.getProfile(user);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.agentFacade.updateProfile(user, body);
    if (result && result.success && 'data' in result) {
      const { data: _data, ...rest } = result as Record<string, unknown>;
      return rest;
    }
    return result;
  }

  @Get('dashboard/stats')
  async getStats(
    @CurrentUser() user: IUser,
    @Query() query: GetAgentStatsDto,
  ) {
    return this.agentFacade.getStats(user, query);
  }

  @Post('listings')
  async createListing(
    @CurrentUser() user: IUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.agentFacade.createListing(user.id, body);
  }

  @Get('listings')
  async getListings(
    @CurrentUser() user: IUser,
    @Query() query: GetAgentListingsDto,
  ) {
    return this.agentFacade.getListings(user, query);
  }

  @Get('commissions')
  async getCommissions(
    @CurrentUser() user: IUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.agentFacade.getCommissions(user.id, pagination);
  }

  @Get('wallet/balance')
  async getBalance(@CurrentUser() user: IUser) {
    const profile = await this.agentFacade.getProfile(user);
    if (!profile) throw new BadRequestException('Agent profile not found');
    const balance = await this.walletFacade.getBalance(profile.id, 'agent_id');
    return { balance };
  }

  @Get('wallet/withdrawals')
  async getWithdrawals(@CurrentUser() user: IUser) {
    const profile = await this.agentFacade.getProfile(user);
    if (!profile) throw new BadRequestException('Agent profile not found');
    const result = await this.walletFacade.getWithdrawals(
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
    return this.agentFacade.requestWithdrawal(
      user,
      body,
      idempotencyKey,
      { ip, ua },
    );
  }

  @Post('wallet/settle')
  async settleCommissions(@CurrentUser() user: IUser) {
    return this.agentFacade.settleCommissions(user.id);
  }
}
