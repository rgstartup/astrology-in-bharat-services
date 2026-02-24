import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const query = request?.query ?? {};

    const role = Array.isArray(query.role) ? query.role[0] : query.role;
    const referralCode = Array.isArray(query.referralCode)
      ? query.referralCode[0]
      : query.referralCode;
    const redirectUrl = Array.isArray(query.redirect_uri)
      ? query.redirect_uri[0]
      : query.redirect_uri;

    const statePayload = {
      role: role ?? null,
      referralCode: referralCode ?? null,
      redirectUrl: redirectUrl ?? null,
    };

    return {
      scope: ['email', 'profile'],
      state: encodeURIComponent(JSON.stringify(statePayload)),
    };
  }
}
