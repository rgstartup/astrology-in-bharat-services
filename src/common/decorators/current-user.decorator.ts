import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

export const CurrentUser = createParamDecorator(
  <T extends keyof AuthenticatedUser | undefined>(
    data: T | undefined,
    ctx: ExecutionContext,
  ) => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (data) {
      // @ts-ignore
      return user[data];
    }

    return user;
  },
);
