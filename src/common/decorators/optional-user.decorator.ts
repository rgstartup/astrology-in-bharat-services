import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

export const OptionalUser = createParamDecorator(
  <T extends keyof User | undefined>(
    data: T | undefined,
    ctx: ExecutionContext,
  ) => {
    const req = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = req.user;

    if (!user) {
      return undefined;
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
