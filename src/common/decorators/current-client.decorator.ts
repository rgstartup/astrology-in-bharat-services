import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';

export const CurrentClient = createParamDecorator(
  <T extends keyof ClientAccount | undefined>(
    data: T | undefined,
    ctx: ExecutionContext,
  ) => {
    const client = getCurrentClientAccount(ctx);

    if (data) {
      return client[data];
    }

    return client;
  },
);

export const getCurrentClientAccount = (
  ctx: ExecutionContext,
): ClientAccount => {
  const req = ctx.switchToHttp().getRequest<{ user?: ClientAccount }>();

  const client = req.user;

  if (!client) {
    throw new UnauthorizedException('Client account not found in request');
  }

  return client;
};
