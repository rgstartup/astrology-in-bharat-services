import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { IMerchant } from '@/common/types/access-token.payload';

export const CurrentMerchant = createParamDecorator(
  <T extends keyof IMerchant | undefined>(
    data: T | undefined,
    context: ExecutionContext,
  ) => {
    const merchant = getCurrentMerchant(context);
    return data ? merchant[data] : merchant;
  },
);

export const getCurrentMerchant = (context: ExecutionContext): IMerchant => {
  const request = context.switchToHttp().getRequest<{ user?: IMerchant }>();
  if (!request.user) {
    throw new UnauthorizedException('Merchant account not found in request');
  }
  return request.user;
};
