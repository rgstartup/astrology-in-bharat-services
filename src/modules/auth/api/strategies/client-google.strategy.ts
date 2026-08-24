import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import { ClientAuthFacade } from '../../application/use-cases/client/client-auth.facade';

@Injectable()
export class ClientGoogleStrategy extends PassportStrategy(
    Strategy,
    'client-google',
) {
    constructor(
        configService: ConfigService,
        private readonly clientAuthFacade: ClientAuthFacade,
    ) {
        const authConfig = configService.get<AuthConfig>('auth');
        if (!authConfig) {
            throw new Error('Auth Config not found');
        }

        const callbackURL =
            authConfig.clientGoogleCallbackUrl;

        super({
            clientID: authConfig.googleClientId,
            clientSecret: authConfig.googleClientSecret,
            callbackURL,
            scope: ['email', 'profile'],
            passReqToCallback: true,
        });
    }

    async validate(
        req: Request & { _strategy_validated?: boolean; user?: any },
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ) {
        if (req._strategy_validated) {
            return done(null, req.user);
        }
        req._strategy_validated = true;

        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error('Google account did not provide an email'));
        }

        const rawState = req?.query?.state as string | undefined;
        let redirectUri: string | undefined;
        if (rawState) {
            try {
                const decoded =
                    typeof rawState === 'string' && rawState.includes('%')
                        ? decodeURIComponent(rawState)
                        : rawState;
                const parsed =
                    typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
                redirectUri = parsed?.redirect_uri;
            } catch {
                try {
                    const parsed = JSON.parse(decodeURIComponent(rawState));
                    redirectUri = parsed?.redirect_uri;
                } catch {
                    // Ignore invalid state
                }
            }
        }

        try {
            const { user, tokens } = await this.clientAuthFacade.loginWithGoogle(
                {
                    providerId: profile.id,
                    email,
                    name: profile.displayName,
                    oauthProfile: profile,
                },
                req.ip,
                req.get('user-agent'),
            );
            return done(null, {
                user,
                tokens,
                redirect_uri: redirectUri,
            });
        } catch (err) {
            return done(err as Error);
        }
    }

}