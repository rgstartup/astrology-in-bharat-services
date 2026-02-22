import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const { role, referralCode } = request;

    const statePayload = {
      role,
      referralCode,
    };

    return {
      scope: ['email', 'profile'],
      state: encodeURIComponent(JSON.stringify(statePayload)),
    };
  }
}
