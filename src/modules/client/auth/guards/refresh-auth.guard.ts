import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ClientJwtRefreshAuthGuard extends AuthGuard('client-jwt-refresh') {}
