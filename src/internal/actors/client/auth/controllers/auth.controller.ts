import { CookieOptions, type Request, type Response } from "express";
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
} from "@nestjs/common";
import {
  InitiateClientRegisterDto,
  CompleteClientRegisterDto,
} from "../dto/client-register.dto";
import { ClientAuthService } from "../auth.service";
import { ClientLoginDto } from "../dto/client-login.dto";
import { ClientGoogleAuthGuard } from "../guards/google-auth.guard";
import { ClientGoogleAuthResult } from "../strategies/google-auth.strategy";
import { ClientJwtRefreshAuthGuard } from "../guards/refresh-auth.guard";
import { ClientJwtLogoutAuthGuard } from "../guards/logout-auth.guard";

@Controller({
  path: ["client/auth"],
  version: "1",
})
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Post("email/register/initiate")
  initiateEmailRegistration(@Body() dto: InitiateClientRegisterDto) {
    return this.clientAuthService.initiateEmailRegistration(dto);
  }

  @Post("email/register/complete")
  async completeEmailRegistration(
    @Body() dto: CompleteClientRegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.clientAuthService.completeEmailRegistration(
      dto,
      req.ip,
      req.get("user-agent"),
    );

    this.setCookies(res, tokens);
    return tokens;
  }

  @Post(["login", "email/login"])
  async login(
    @Body() dto: ClientLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.clientAuthService.loginWithEmail(
      dto,
      req.ip,
      req.get("user-agent"),
    );

    this.setCookies(res, tokens);
    return tokens;
  }

  @Get("google/login")
  @UseGuards(ClientGoogleAuthGuard)
  googleLogin() {
    return;
  }

  @Get("google/callback")
  @UseGuards(ClientGoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const authData = req.user as ClientGoogleAuthResult;

    if (!authData || !authData.tokens) {
      const errorBase = authData?.redirect_uri;
      return res.redirect(`${errorBase}?error=google_auth_failed`);
    }

    this.setCookies(res, authData.tokens);

    return res.redirect(authData.redirect_uri!);
  }

  @Post("refresh")
  @Get("refresh")
  @UseGuards(ClientJwtRefreshAuthGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req as unknown as Record<string, unknown>)[
      "refreshToken"
    ] as string;

    const tokens = await this.clientAuthService.refreshToken(
      refreshToken,
      req.ip,
      req.get("user-agent"),
    );
    this.setCookies(res, tokens);
    return tokens;
  }

  /**
   * Logs out the client, revoking sessions in DB and clearing auth cookies.
   *
   * Utilizes ClientJwtLogoutAuthGuard which ignores token expiration so
   * expired users can logout without receiving a 401 Unauthorized.
   *
   * @param req - Express request holding optional user payload and cookies.
   * @param res - Express response for clearing cookies.
   * @returns Success confirmation.
   */
  @Get("logout")
  @Post("logout")
  @UseGuards(ClientJwtLogoutAuthGuard)
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

    await this.clientAuthService.logout({
      userId: user?.user_id,
      clientId: user?.id,
      sessionId,
    });

    this.clearCookies(res);
    return { success: true, message: "Logged out successfully" };
  }

  private clearCookies(res: Response) {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    };

    res.cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
