import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthRequest } from './google-login-query.guard';

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<GoogleAuthRequest>();

    if (!request.googleLoginQuery) {
      // Callback.
      // Google already returned state.
      return {};
    }

    const { role, redirect_uri, referral_code } = request.googleLoginQuery;

    return {
      scope: ['email', 'profile'],
      state: encodeURIComponent(
        JSON.stringify({
          role,
          redirect_uri,
          referral_code,
        }),
      ),
    };
  }

  handleRequest<TUser = GoogleUser>(
    err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Google authentication failed');
    }

    return user as TUser;
  }
}
