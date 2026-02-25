import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
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
}
