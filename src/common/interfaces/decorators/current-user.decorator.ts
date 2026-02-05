import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@/modules/users';

export const CurrentUser = createParamDecorator(
  <T extends keyof User | undefined>(
    data: T | undefined,
    ctx: ExecutionContext,
  ) => {
    const req = ctx.switchToHttp().getRequest<{ user?: User }>();

    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (data) {
      // TypeScript knows this may be undefined, so we cast as User[T] | undefined
      return user[data];
    }

    return user;
  },
);

