import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ExpertJwtRefreshAuthGuard extends AuthGuard(
  'expert-jwt-refresh',
) {}
