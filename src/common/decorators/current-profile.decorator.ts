import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { getCurrentUser } from './current-user.decorator';

export const CurrentProfile = createParamDecorator(
  (_data: undefined, ctx: ExecutionContext): string => {
    const user = getCurrentUser(ctx);

    if (!user.profile) {
      throw new UnauthorizedException(
        'Profile not found. Complete your profile setup before accessing this resource.',
      );
    }

    return user.profile;
  },
);
