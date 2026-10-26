import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import { ExpertJwtRefreshAuthGuard } from "../guards/refresh-auth.guard";
import { ExpertGoogleAuthGuard } from "../guards/google-auth.guard";
import { ExpertGoogleAuthResult } from "../strategies/google-auth.strategy";
import { ExpertJwtLogoutAuthGuard } from "../guards/logout-auth.guard";
import { ExpertAuthService } from "../auth.service";
import { ExpertLoginDto } from "../dto/expert-login.dto";
import {
  CompleteExpertRegisterDto,
  InitiateExpertRegisterDto,
} from "../dto/expert-register.dto";

type RefreshTokenRequest = Request & { refreshToken: string };

@Controller({ path: "expert/auth", version: "1" })
export class ExpertAuthController {
  constructor(private readonly authService: ExpertAuthService) {}

  @Get("google/login")
  @UseGuards(ExpertGoogleAuthGuard)
  googleLogin() {
    return;
  }

  @Get("google/callback")
  @UseGuards(ExpertGoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const authData = req.user as ExpertGoogleAuthResult;

    if (!authData || !authData.tokens) {
      const errorBase = authData?.redirect_uri;
      return res.redirect(`${errorBase}?error=google_auth_failed`);
    }

    this.setCookies(res, authData.tokens);

    return res.redirect(authData.redirect_uri!);
  }

  @Post("email/register/initiate")
  initiate(@Body() dto: InitiateExpertRegisterDto) {
    return this.authService.initiateEmailRegistration(dto);
  }

  @Post("email/register/complete")
  async complete(
    @Body() dto: CompleteExpertRegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.completeEmailRegistration(
      dto,
      req.ip,
      req.get("user-agent"),
    );
    this.setCookies(res, result);
    return result;
  }

  @Post("email/login")
  async login(
    @Body() dto: ExpertLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithEmail(
      dto,
      req.ip,
      req.get("user-agent"),
    );
    this.setCookies(res, result);
    return result;
  }

  @Post("refresh")
  @UseGuards(ExpertJwtRefreshAuthGuard)
  async refresh(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshToken(req.refreshToken);
    this.setCookies(res, tokens);
    return tokens;
  }

  /**
   * Logs out the expert, revoking sessions in DB, marking availability offline, and clearing auth cookies.
   *
   * Utilizes ExpertJwtLogoutAuthGuard which ignores token expiration so
   * expired experts can logout without receiving a 401 Unauthorized.
   *
   * @param req - Express request holding optional user payload and cookies.
   * @param res - Express response for clearing cookies.
   * @returns Success confirmation.
   */
  @Get("logout")
  @Post("logout")
  @UseGuards(ExpertJwtLogoutAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = (req as unknown as Record<string, unknown>)["user"] as
      | { id?: number; user_id?: number }
      | undefined;

    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const refreshToken = cookies?.refreshToken;
    const sessionId = refreshToken?.split(".")[0];

    await this.authService.logout({
      userId: user?.user_id,
      expertId: user?.id,
      sessionId,
    });

    this.clearCookies(res);
    return { success: true, message: "Logged out successfully" };
  }

  private clearCookies(res: Response) {
    const options: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    };
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const options: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    };
    res.cookie("accessToken", tokens.accessToken, {
      ...options,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", tokens.refreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
