import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { IAccessTokenPayload } from '../types/access-token.payload';


export type IUser =  Omit<IAccessTokenPayload, 'sub'> & { id: string };

export const CurrentUser = createParamDecorator(
  <T extends keyof IUser | undefined>(
    data: T | undefined,
    ctx: ExecutionContext,
  ) => {
    const req = ctx.switchToHttp().getRequest<{ user?: IUser }>();

    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (data) {
      // TypeScript knows this may be undefined, so we cast as IUser[T] | undefined
      return user[data];
    }

    return user;
  },
);
