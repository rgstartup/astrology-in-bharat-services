import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IExpert } from '@/common/types/access-token.payload';
import { IS_PUBLIC } from '@/common/decorators/public.decorator';

@Injectable()
export class ExpertJwtAuthGuard extends AuthGuard('expert-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest<TUser = IExpert>(
    err: unknown,
    user: IExpert | undefined,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    if (err || !user) {
      return super.handleRequest(err, user, info, context, status);
    }

    return user as TUser;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
