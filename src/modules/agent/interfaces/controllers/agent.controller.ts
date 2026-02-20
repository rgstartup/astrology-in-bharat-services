import { Controller, Post, Body, Req, Res, UnauthorizedException, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AgentLoginUseCase } from '../../application/use-cases/agent-login.use-case';
import { AgentLoginDto } from '../../application/dtos/agent-login.dto';
import { AGENT_COOKIE_NAMES, getAccessTokenCookieOptions, getRefreshTokenCookieOptions } from '@/modules/auth/application/helpers/cookie.helper';
import { AgentService } from '../../application/services/agent.service';
import { AgentAuthGuard } from '../../interfaces/guards/agent-auth.guard';
import { CreateListingDto } from '../../application/dtos/create-listing.dto';
import { AgentRegisterUserDto } from '../../application/dtos/agent-register-user.dto';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentLoginUseCase: AgentLoginUseCase,
    private readonly agentService: AgentService,
  ) { }

  @Post('login')
  @ApiOperation({ summary: 'Agent login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(
    @Body() dto: AgentLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.agentLoginUseCase.execute(dto, ip, userAgent);

    // Set agent-specific cookies (separate from user cookies to avoid collision)
    res.cookie(AGENT_COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, getAccessTokenCookieOptions());
    res.cookie(AGENT_COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, getRefreshTokenCookieOptions());

    return {
      success: result.success,
      token: result.accessToken,
      agent: result.agent,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh agent token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenCookie = req.cookies?.[AGENT_COOKIE_NAMES.REFRESH_TOKEN];

    if (!refreshTokenCookie) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const [agentId, refreshToken] = refreshTokenCookie.split('.');

    if (!agentId || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const tokens = await this.agentLoginUseCase.refreshTokens(agentId, refreshToken);

    res.cookie(AGENT_COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, getAccessTokenCookieOptions());
    res.cookie(AGENT_COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, getRefreshTokenCookieOptions());

    return {
      accessToken: tokens.accessToken,
      message: 'Tokens refreshed successfully',
    };
  }

  @UseGuards(AgentAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get agent profile' })
  async getProfile(@Req() req: any) {
    return this.agentService.getProfile(req.user.id);
  }

  @UseGuards(AgentAuthGuard)
  @Get('listings')
  @ApiOperation({ summary: 'Get listings (astrologer, mandir, shop)' })
  async getListings(
    @Query('type') type: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.agentService.getListings(type, search, page, limit);
  }

  @UseGuards(AgentAuthGuard)
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get agent dashboard stats' })
  async getDashboardStats(@Req() req: any) {
    return this.agentService.getDashboardStats(req.user.id);
  }

  @UseGuards(AgentAuthGuard)
  @Post('listings')
  @ApiOperation({ summary: 'Create a new listing (mandir, puja_shop, astrologer)' })
  async createListing(
    @Req() req: any,
    @Body() dto: CreateListingDto,
  ) {
    return this.agentService.createListing(req.user.id, dto);
  }

  @UseGuards(AgentAuthGuard)
  @Post('register-user')
  @ApiOperation({ summary: 'Agent registers a User or Expert on their behalf' })
  async registerUser(
    @Req() req: any,
    @Body() dto: AgentRegisterUserDto,
  ) {
    return this.agentService.registerUserByAgent(req.user.id, dto);
  }
}
