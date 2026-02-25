import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly config: ConfigService) {
    super();
  }
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const query = request?.query ?? {};

    const role =
      (typeof query.role === 'string' && query.role) ||
      request.role;
    const referralCode =
      (typeof query.referralCode === 'string' && query.referralCode) ||
      request.referralCode;
    const redirect_uri =
      (typeof query.redirect_uri === 'string' && query.redirect_uri) ||
      request.redirect_uri;

    const statePayload = {
      role,
      referralCode,
      redirect_uri,
    };

    return {
      scope: ['email', 'profile'],
      state: encodeURIComponent(JSON.stringify(statePayload)),
    };
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Single-shot mechanism to prevent double handleRequest calls from overriding results
    if (request._auth_guard_handled) {
      this.logger.log(`Google Auth handleRequest already handled for ${request.url}, skipping second call. User present in request: ${!!request.user}`);
      return user || request.user;
    }
    request._auth_guard_handled = true;

    this.logger.log(`Google Auth handleRequest - url: ${request.url}, err: ${err}, user: ${!!user}, info: ${JSON.stringify(info)}`);
    if (!user) {
      this.logger.log(`Trace for failed handleRequest: ${new Error().stack}`);
    }

    if (user) {
      request.user = user;
    }

    if (response.headersSent) {
      this.logger.log(`Headers already sent for ${request.url}, skipping custom redirect logic.`);
      return user;
    }

    if (err || !user) {

      const rawState = request?.query?.state;
      let state: any = {};
      if (rawState) {
        try {
          state = JSON.parse(decodeURIComponent(rawState));
        } catch { }
      }

      // Determine redirect URL
      const fallbackUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const astrologerUrl = this.config.get<string>('ASTROLOGER_FRONTEND_URL') || 'http://localhost:3003';

      let redirectBase = state.redirect_uri || state.redirectUrl || fallbackUrl;

      // Normalize redirectBase
      redirectBase = redirectBase.replace(/\/+$/, '');

      // Handle application-specific login paths
      if (redirectBase.includes('localhost:3003') || redirectBase.includes(astrologerUrl)) {
        // Astrologer dashboard login is at the root /
        // Strip /login if it was accidentally added or passed
        redirectBase = redirectBase.replace(/\/login$/, '');
      } else if (redirectBase.includes('localhost:3000') || redirectBase.includes(fallbackUrl)) {
        // Main app login is at /sign-in
        if (!redirectBase.endsWith('/sign-in')) {
          redirectBase += '/sign-in';
        }
      }

      const errorMessage = err?.message || 'Google authentication failed';

      response.redirect(`${redirectBase}${redirectBase.includes('?') ? '&' : '?'}error=${encodeURIComponent(errorMessage)}`);
      throw new UnauthorizedException(errorMessage);
    }
    return user;
  }
}
