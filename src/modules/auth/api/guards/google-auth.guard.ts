import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const { role, referralCode, redirect_uri } = request.query;

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
