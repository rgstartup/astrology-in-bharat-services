import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IAccessTokenPayloadExpert } from '@/common/types/access-token.payload';

@Injectable()
export class ExpertJwtAuthGuard extends AuthGuard('expert-jwt') {
  handleRequest<TUser = IAccessTokenPayloadExpert>(
    err: unknown,
    user: IAccessTokenPayloadExpert | undefined,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    if (err || !user) {
      return super.handleRequest(err, user, info, context, status);
    }

    return user as TUser;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
