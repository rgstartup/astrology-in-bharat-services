import { CookieOptions, Request, Response } from 'express';
import {
    Controller,
    Post,
    Body,
    Req,
    Res,
    Get,
    UseGuards,
} from '@nestjs/common';

import {
    InitiateClientRegisterDto, CompleteClientRegisterDto
} from '../dto/client/client-register.dto';
import { instanceToPlain } from 'class-transformer';
import { ClientAuthFacade } from '../../application/use-cases/client/client-auth.facade';
import { ClientLoginDto } from '../dto/client/client-login.dto';
import { ClientGoogleAuthGuard } from '../guards/client-google-auth.guard';
import { UserWithTokens } from '@/common/types/google-auth.response';

@Controller({
    path: 'auth/client',
    version: '1',
})
export class ClientAuthController {
    constructor(private readonly clientAuthFacade: ClientAuthFacade) { }

    @Post('email/register/initiate')
    async initiateEmailRegistration(@Body() dto: InitiateClientRegisterDto) {
        return this.clientAuthFacade.initiateEmailRegistration(dto);
    }

    @Post('email/register/complete')
    async completeEmailRegistration(
        @Body() dto: CompleteClientRegisterDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { user, tokens } = await this.clientAuthFacade.completeEmailRegistration(
            dto,
            req.ip,
            req.get('user-agent'),
        );

        this.setCookies(res, tokens);
        return instanceToPlain({ user, ...tokens });
    }

    @Post('email/login')
    async login(
        @Body() dto: ClientLoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { user, tokens } = await this.clientAuthFacade.loginWithEmail(
            dto,
            req.ip,
            req.get('user-agent'),
        );

        this.setCookies(res, tokens);
        return instanceToPlain({ user, ...tokens });
    }

    @Get('google/login')
    @UseGuards(ClientGoogleAuthGuard)
    googleLogin() {
        return;
    }

    @Get('google/callback')
    @UseGuards(ClientGoogleAuthGuard)
    googleCallback(@Req() req: Request, @Res() res: Response) {

        const authData = req.user as UserWithTokens;

        if (!authData || !authData.tokens) {
            const errorBase = authData?.redirect_uri;
            return res.redirect(`${errorBase}?error=google_auth_failed`);
        }

        // Set cookies
        this.setCookies(res, authData.tokens);

        return res.redirect(authData?.redirect_uri!);
    }

    // Backward-compatible alias for clients still using /auth/login
    // @Post('login')
    // async loginAlias(
    //     @Body() dto: LoginDto,
    //     @Req() req: Request,
    //     @Res({ passthrough: true }) res: Response,
    // ) {
    //     const { user, tokens } = await this.authFacade.loginWithEmail(
    //         dto,
    //         req.ip,
    //         req.get('user-agent'),
    //     );

    //     this.setCookies(res, tokens);
    //     return instanceToPlain({ user, ...tokens });
    // }

    // @Get('email/verify')
    // confirmEmail(@Query('token') token: string) {
    //     return this.authFacade.verifyEmail(token);
    // }

    // @Post('email/confirm/new')
    // resendConfirmation(@Body('email') email: string) {
    //     return this.authFacade.resendVerificationEmail(email);
    // }

    // @Post('forgot/password')
    // forgotPassword(@Body() dto: ForgotPasswordDto) {
    //     return this.authFacade.forgotPassword(dto.email);
    // }

    // @Post('reset/password')
    // resetPassword(@Query('token') token: string, @Body() dto: ResetPasswordDto) {
    //     return this.authFacade.resetPassword(token, dto.password);
    // }

    // @Post('refresh')
    // @Get('refresh')
    // @UseGuards(JwtAuthRefreshGuard)
    // async refresh(
    //     @Req() req: Request,
    //     @Res({ passthrough: true }) res: Response,
    // ) {
    //     const tokens = await this.authFacade.refreshToken(
    //         (req as unknown as Record<string, unknown>)['refreshToken'] as string,
    //     );
    //     this.setCookies(res, tokens);
    //     return tokens;
    // }

    // @Post('logout')
    // @UseGuards(JwtAuthGuard)
    // logout(
    //     @CurrentUser('id') id: string,
    //     @Res({ passthrough: true }) res: Response,
    // ) {
    //     res.clearCookie('accessToken');
    //     res.clearCookie('refreshToken');
    //     return this.authFacade.logout(id);
    // }

    private setCookies(
        res: Response,
        tokens: { accessToken: string; refreshToken: string },
    ) {
        const cookieOptions: CookieOptions = {
            httpOnly: true,
            secure: true, // Must be true for sameSite: 'none'
            sameSite: 'none', // Allows cross-site cookie usage
            path: '/',
        };

        res.cookie('accessToken', tokens.accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000, // 15 min
        });

        res.cookie('refreshToken', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }
}
