import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MerchantJwtRefreshAuthGuard extends AuthGuard(
  'merchant-jwt-refresh',
) {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
