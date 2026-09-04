import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { IExpert } from '@/common/types/access-token.payload';

export const CurrentExpert = createParamDecorator(
  <T extends keyof IExpert | undefined>(
    data: T | undefined,
    context: ExecutionContext,
  ) => {
    const expert = getCurrentExpert(context);
    return data ? expert[data] : expert;
  },
);

export const getCurrentExpert = (context: ExecutionContext): IExpert => {
  const request = context.switchToHttp().getRequest<{ user?: IExpert }>();
  if (!request.user) {
    throw new UnauthorizedException('Expert account not found in request');
  }
  return request.user;
};
