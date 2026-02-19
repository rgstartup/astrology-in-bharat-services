import { Controller, Post, Body, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AgentLoginUseCase } from '../../application/use-cases/agent-login.use-case';
import { AgentLoginDto } from '../../application/dtos/agent-login.dto';
import { COOKIE_NAMES, getAccessTokenCookieOptions, getRefreshTokenCookieOptions } from '@/modules/auth/application/helpers/cookie.helper';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentLoginUseCase: AgentLoginUseCase,
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

    // Set cookies as per project standard
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, getAccessTokenCookieOptions());
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, getRefreshTokenCookieOptions());

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
    const refreshTokenCookie = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];

    if (!refreshTokenCookie) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const [agentId, refreshToken] = refreshTokenCookie.split('.');

    if (!agentId || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const tokens = await this.agentLoginUseCase.refreshTokens(agentId, refreshToken);

    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, getAccessTokenCookieOptions());
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, getRefreshTokenCookieOptions());

    return {
      accessToken: tokens.accessToken,
      message: 'Tokens refreshed successfully',
    };
  }
}
