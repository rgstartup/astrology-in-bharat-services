import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC } from '../decorators/public.decorator';

export interface IPayload {
  sub: number;
  roles: string[];
  iat: number;
  exp: number;
}

export interface IUser extends Omit<IPayload, 'sub'> {
  id: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();

    // Cookie-only auth
    const cookies = (req as any).cookies || {};

    // IMPORTANT: use your real cookie name here
    const token = cookies.access_token || cookies.token || cookies.jwt;

    if (!token) {
      // You can log once while debugging
      console.log('JwtAuthGuard: cookies received =', cookies);
      throw new UnauthorizedException('Missing token');
    }

    try {
      // Verify token
      const payload = this.jwtService.verify<IPayload>(token);

      (req as any).user = {
        ...payload,
        id: payload.sub,
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
